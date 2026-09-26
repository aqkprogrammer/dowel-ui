import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useEffect, useState, type RefObject } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  PermissionPrompt,
  usePermissionPrompt,
  type PermissionCapability,
  type PermissionDecision,
  type PermissionPromptProps,
  type PermissionStore,
  type UsePermissionPromptOptions,
  type UsePermissionPromptResult,
} from "./permission-prompt";

const CALENDAR: PermissionCapability = {
  id: "calendar.read",
  title: "read your calendar",
  description: "Only while this conversation is open.",
  can: ["See event times and titles", "See who is invited"],
  cannot: ["Change or delete events", "See other calendars"],
  risk: "low",
  scope: "Work calendar",
};

const CONTACTS: PermissionCapability = {
  id: "contacts.read",
  title: "read your contacts",
  risk: "medium",
};

const SEND: PermissionCapability = {
  id: "mail.send",
  title: "send email as you",
  risk: "high",
};

const REASON = "to find a free slot for the meeting you asked for";
const HEADING = "Claude wants to read your calendar";

function Example(props: Partial<PermissionPromptProps>) {
  return (
    <PermissionPrompt
      requester="Claude"
      capability={CALENDAR}
      reason={REASON}
      onDecide={vi.fn()}
      {...props}
    />
  );
}

/** A consumer that keeps the answer, as a real one would. */
function Stateful({
  initial = null,
  onDecide,
}: {
  initial?: PermissionDecision | null;
  onDecide?: (decision: PermissionDecision) => void;
}) {
  const [decision, setDecision] = useState<PermissionDecision | null>(initial);
  return (
    <>
      <Example
        decision={decision}
        onDecide={(next) => {
          setDecision(next);
          onDecide?.(next);
        }}
      />
      <button type="button">Elsewhere</button>
    </>
  );
}

function choiceNames() {
  return within(screen.getByRole("region"))
    .getAllByRole("button")
    .map((button) => button.textContent);
}

function status(container: HTMLElement) {
  return container.querySelector("[data-slot='permission-prompt-status']");
}

/** Longer than the announcement delay. */
async function pause(ms = 250) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

describe("PermissionPrompt", () => {
  describe("rendering", () => {
    it("is a region named by its heading", () => {
      render(<Example />);
      expect(screen.getByRole("region", { name: HEADING })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: HEADING })).toBeInTheDocument();
    });

    it("gives the reason as its own sentence", () => {
      render(<Example />);
      expect(
        screen.getByText("To find a free slot for the meeting you asked for."),
      ).toBeInTheDocument();
    });

    it("leaves a reason that is already a sentence alone, and passes elements through", () => {
      const { rerender } = render(<Example reason="Because you asked me to!" />);
      expect(screen.getByText("Because you asked me to!")).toBeInTheDocument();
      rerender(<Example reason={<em>a custom reason</em>} />);
      expect(screen.getByText("a custom reason").tagName).toBe("EM");
    });

    it("shows the description and the scope", () => {
      render(<Example />);
      expect(screen.getByText("Only while this conversation is open.")).toBeInTheDocument();
      expect(screen.getByText("Work calendar")).toBeInTheDocument();
      expect(screen.getByText(/Applies to/)).toBeInTheDocument();
    });

    it("lists what it allows and what it does not, each list named", () => {
      render(<Example />);
      const can = screen.getByRole("list", { name: "This lets Claude:" });
      const cannot = screen.getByRole("list", { name: "Claude can't:" });
      expect(
        within(can)
          .getAllByRole("listitem")
          .map((item) => item.textContent),
      ).toEqual(CALENDAR.can);
      expect(
        within(cannot)
          .getAllByRole("listitem")
          .map((item) => item.textContent),
      ).toEqual(CALENDAR.cannot);
    });

    it("leaves out what was not given", () => {
      const { container } = render(
        <PermissionPrompt
          requester="Claude"
          capability={{ id: "x", title: "do a thing" }}
          onDecide={vi.fn()}
        />,
      );
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
      for (const slot of ["risk", "reason", "description", "scope"]) {
        expect(container.querySelector(`[data-slot='permission-prompt-${slot}']`)).toBeNull();
      }
      expect(
        screen.getByRole("button", { name: "Allow once" }),
      ).not.toHaveAccessibleDescription();
    });

    it.each([
      ["low", "Low risk"],
      ["medium", "Medium risk"],
      ["high", "High risk"],
    ] as const)("says %s risk in words, with a decorative icon", (risk, words) => {
      const { container } = render(<Example capability={{ ...CALENDAR, risk }} />);
      const label = container.querySelector("[data-slot='permission-prompt-risk']");
      expect(label).toHaveTextContent(words);
      expect(label?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
      expect(screen.getByRole("region")).toHaveAttribute("data-risk", risk);
    });

    it("describes each Allow button by the risk, so tabbing straight to it still says so", () => {
      render(<Example capability={SEND} />);
      expect(screen.getByRole("button", { name: "Allow once" })).toHaveAccessibleDescription(
        "High risk",
      );
      expect(
        screen.getByRole("button", { name: "Allow for this session" }),
      ).toHaveAccessibleDescription("High risk");
      expect(
        screen.getByRole("button", { name: "Don't allow" }),
      ).not.toHaveAccessibleDescription();
    });

    it("carries data-agent-ui, so answering never takes over an agent surface", () => {
      render(<Example />);
      expect(screen.getByRole("region")).toHaveAttribute("data-agent-ui", "");
      expect(screen.getByRole("region")).toHaveAttribute("data-slot", "permission-prompt");
    });
  });

  describe("choices", () => {
    it("offers all four by default, Allow once first and emphasised", () => {
      render(<Example />);
      expect(choiceNames()).toEqual([
        "Allow once",
        "Allow for this session",
        "Always allow",
        "Don't allow",
      ]);
      expect(screen.getByRole("button", { name: "Allow once" }).className).toContain(
        "bg-primary",
      );
    });

    it("does not offer Always allow for high risk by default", () => {
      render(<Example capability={SEND} />);
      expect(choiceNames()).toEqual(["Allow once", "Allow for this session", "Don't allow"]);
    });

    it("offers Always allow for high risk when options opt in", () => {
      render(<Example capability={SEND} options={["once", "always", "deny"]} />);
      expect(choiceNames()).toEqual(["Allow once", "Always allow", "Don't allow"]);
    });

    it.each([
      ["Allow once", "once", "Allowed once"],
      ["Allow for this session", "session", "Allowed for this session"],
      ["Always allow", "always", "Always allowed"],
      ["Don't allow", "deny", "Not allowed"],
    ] as const)("%s calls onDecide and shows the result", async (name, decision, result) => {
      const onDecide = vi.fn();
      const user = userEvent.setup();
      render(<Example onDecide={onDecide} />);

      await user.click(screen.getByRole("button", { name }));

      expect(onDecide).toHaveBeenCalledExactlyOnceWith(decision);
      expect(screen.getByText(result)).toBeInTheDocument();
      expect(screen.getByRole("region")).toHaveAttribute("data-state", "decided");
      expect(screen.getByRole("region")).toHaveAttribute("data-decision", decision);
      expect(screen.getByRole("button", { name: "Change" })).toBeInTheDocument();
    });
  });

  describe("controlled", () => {
    it("shows the decision it is given, with Change", () => {
      render(<Example decision="deny" />);
      expect(screen.getByText("Not allowed")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: HEADING })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Allow once" })).not.toBeInTheDocument();
    });

    it("stays on the choices after a click while decision is null", async () => {
      const onDecide = vi.fn();
      const user = userEvent.setup();
      render(<Example decision={null} onDecide={onDecide} />);
      await user.click(screen.getByRole("button", { name: "Allow once" }));
      expect(onDecide).toHaveBeenCalledWith("once");
      expect(screen.getByRole("button", { name: "Allow once" })).toBeInTheDocument();
    });

    it("lets the answer be changed", async () => {
      const onDecide = vi.fn();
      const user = userEvent.setup();
      render(<Stateful initial="always" onDecide={onDecide} />);

      await user.click(screen.getByRole("button", { name: "Change" }));
      await user.click(screen.getByRole("button", { name: "Don't allow" }));

      expect(onDecide).toHaveBeenCalledExactlyOnceWith("deny");
      expect(screen.getByText("Not allowed")).toBeInTheDocument();
    });

    it("Cancel returns to the result without answering", async () => {
      const onDecide = vi.fn();
      const user = userEvent.setup();
      render(<Stateful initial="session" onDecide={onDecide} />);

      await user.click(screen.getByRole("button", { name: "Change" }));
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(onDecide).not.toHaveBeenCalled();
      expect(screen.getByText("Allowed for this session")).toBeInTheDocument();
    });

    it("describes Change by what it changes, since several may be on a page", () => {
      render(<Example decision="once" />);
      expect(screen.getByRole("button", { name: "Change" })).toHaveAccessibleDescription(
        `${HEADING} Allowed once`,
      );
    });

    it("hides Change when not changeable", () => {
      render(<Example decision="once" changeable={false} />);
      expect(screen.queryByRole("button", { name: "Change" })).not.toBeInTheDocument();
    });
  });

  describe("focus", () => {
    it("does not take focus when it appears", () => {
      render(<Example />);
      expect(document.body).toHaveFocus();
    });

    it("with autoFocus, focuses the prompt itself rather than Allow", async () => {
      const onDecide = vi.fn();
      const user = userEvent.setup();
      render(<Example autoFocus onDecide={onDecide} />);

      const region = screen.getByRole("region");
      expect(region).toHaveFocus();
      expect(region).toHaveAttribute("tabindex", "-1");
      // A keypress already in flight grants nothing.
      await user.keyboard("{Enter}");
      expect(onDecide).not.toHaveBeenCalled();
    });

    it("moves focus to the result after answering from the keyboard", async () => {
      const user = userEvent.setup();
      const { container } = render(<Stateful />);
      screen.getByRole("button", { name: "Allow for this session" }).focus();
      await user.keyboard("{Enter}");

      const outcome = container.querySelector("[data-slot='permission-prompt-outcome']");
      expect(outcome).toHaveFocus();
      expect(outcome).toHaveAttribute("tabindex", "-1");
    });

    it("Change moves focus to the current choice, and Cancel back to Change", async () => {
      const user = userEvent.setup();
      render(<Stateful initial="session" />);

      await user.click(screen.getByRole("button", { name: "Change" }));
      expect(screen.getByRole("button", { name: "Allow for this session" })).toHaveFocus();

      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.getByRole("button", { name: "Change" })).toHaveFocus();
    });

    it("Change falls back to the first choice when the current one is not offered", async () => {
      const user = userEvent.setup();
      render(<Example decision="always" options={["once", "deny"]} />);
      await user.click(screen.getByRole("button", { name: "Change" }));
      expect(screen.getByRole("button", { name: "Allow once" })).toHaveFocus();
    });

    it("never moves focus for a decision applied from elsewhere", () => {
      const { rerender } = render(
        <>
          <Example decision={null} />
          <button type="button">Elsewhere</button>
        </>,
      );
      screen.getByRole("button", { name: "Elsewhere" }).focus();
      rerender(
        <>
          <Example decision="once" />
          <button type="button">Elsewhere</button>
        </>,
      );
      expect(screen.getByRole("button", { name: "Elsewhere" })).toHaveFocus();
    });

    it("leaves focus alone if the person moved on before the answer landed", async () => {
      const user = userEvent.setup();
      function Delayed() {
        const [decision, setDecision] = useState<PermissionDecision | null>(null);
        const [pending, setPending] = useState<PermissionDecision | null>(null);
        return (
          <>
            <Example decision={decision} onDecide={setPending} />
            <button type="button" onClick={() => setDecision(pending)}>
              Apply
            </button>
          </>
        );
      }
      render(<Delayed />);
      screen.getByRole("button", { name: "Allow once" }).focus();
      await user.keyboard("{Enter}");
      await user.click(screen.getByRole("button", { name: "Apply" }));
      expect(screen.getByRole("button", { name: "Apply" })).toHaveFocus();
    });
  });

  describe("announcement", () => {
    it("is a status region, empty at first and filled a moment later", async () => {
      const { container } = render(<Example capability={SEND} />);
      const region = status(container);
      expect(region).toHaveAttribute("role", "status");
      expect(region).toBeEmptyDOMElement();
      await waitFor(() => {
        expect(region).toHaveTextContent(
          "Permission request: Claude wants to send email as you. High risk.",
        );
      });
    });

    it("leaves out the risk sentence when there is no risk", async () => {
      const { container } = render(
        <Example capability={{ id: "x", title: "read your files" }} />,
      );
      await waitFor(() => {
        expect(status(container)).toHaveTextContent(
          "Permission request: Claude wants to read your files.",
        );
      });
    });

    it.each([
      ["announce is off", { announce: false }],
      ["it takes focus", { autoFocus: true }],
      ["it arrives decided", { decision: "once" as const }],
    ])("says nothing when %s", async (_, props) => {
      const { container } = render(<Example {...props} />);
      await pause();
      expect(status(container)).toBeEmptyDOMElement();
    });

    it("stays in place while the prompt is answered, so nothing is re-announced", async () => {
      const user = userEvent.setup();
      const { container } = render(<Stateful />);
      const region = status(container);
      await waitFor(() => {
        expect(region).not.toBeEmptyDOMElement();
      });
      await user.click(screen.getByRole("button", { name: "Allow once" }));
      expect(status(container)).toBe(region);
    });
  });

  describe("API", () => {
    it("lets className win a conflict", () => {
      render(<Example className="p-2" />);
      const region = screen.getByRole("region");
      expect(region).toHaveClass("p-2");
      expect(region).not.toHaveClass("p-4");
    });

    it("forwards an object ref and a callback ref to the section", () => {
      const ref = createRef<HTMLElement>();
      const { unmount } = render(<Example ref={ref} />);
      expect(ref.current?.tagName).toBe("SECTION");
      unmount();

      const callback = vi.fn();
      render(<Example ref={callback} />);
      expect(callback).toHaveBeenCalledWith(expect.any(HTMLElement));
    });

    it("forwards other props to the section", () => {
      render(<Example data-testid="prompt" id="calendar-permission" />);
      expect(screen.getByTestId("prompt")).toHaveAttribute("id", "calendar-permission");
    });

    it("renders children inside the region", () => {
      render(
        <Example>
          <p>Extra detail</p>
        </Example>,
      );
      expect(within(screen.getByRole("region")).getByText("Extra detail")).toBeInTheDocument();
    });

    it("takes labels for other languages", async () => {
      const user = userEvent.setup();
      render(
        <Example
          labels={{
            heading: (requester, title) => `${requester} möchte ${title}`,
            choice: {
              once: "Einmal erlauben",
              session: "Für diese Sitzung",
              always: "Immer erlauben",
              deny: "Nicht erlauben",
            },
            outcome: {
              once: "Einmal erlaubt",
              session: "Für diese Sitzung erlaubt",
              always: "Immer erlaubt",
              deny: "Nicht erlaubt",
            },
          }}
          capability={{ ...CALENDAR, title: "deinen Kalender lesen" }}
        />,
      );
      expect(
        screen.getByRole("region", { name: "Claude möchte deinen Kalender lesen" }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Nicht erlauben" }));
      expect(screen.getByText("Nicht erlaubt")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has no violations while asking", async () => {
      const { container } = render(<Example capability={{ ...SEND, can: ["Send"] }} />);
      await expectNoA11yViolations(container);
    });

    it("has no violations once answered", async () => {
      const { container } = render(<Example decision="session" />);
      await expectNoA11yViolations(container);
    });

    it("has no violations while changing the answer", async () => {
      const user = userEvent.setup();
      const { container } = render(<Stateful initial="once" />);
      await user.click(screen.getByRole("button", { name: "Change" }));
      await expectNoA11yViolations(container);
    });
  });
});

/* ------------------------------------------------------------------ */
/*  usePermissionPrompt                                                */
/* ------------------------------------------------------------------ */

function Harness({
  apiRef,
  options,
}: {
  apiRef: RefObject<UsePermissionPromptResult | null>;
  options?: UsePermissionPromptOptions;
}) {
  const api = usePermissionPrompt(options);
  useEffect(() => {
    apiRef.current = api;
  });
  return (
    <>
      <button type="button">Elsewhere</button>
      <output aria-label="Grants">
        {api.grants.map((grant) => `${grant.capabilityId}:${grant.decision}`).join(",")}
      </output>
      {api.prompt}
    </>
  );
}

function setup(options?: UsePermissionPromptOptions) {
  const apiRef = createRef<UsePermissionPromptResult>();
  const utils = render(<Harness apiRef={apiRef} options={options} />);
  const api = () => {
    if (!apiRef.current) throw new Error("no api");
    return apiRef.current;
  };
  const ask = (capability: PermissionCapability, reason?: string) => {
    let answer: Promise<PermissionDecision> = Promise.resolve("deny");
    act(() => {
      answer = api().request(capability, { requester: "Claude", reason });
    });
    return answer;
  };
  return { ...utils, api, ask };
}

function memoryStore() {
  const data = new Map<string, PermissionDecision>();
  const store: PermissionStore = {
    get: (key) => Promise.resolve(data.get(key)),
    set: (key, decision) => {
      data.set(key, decision);
      return Promise.resolve();
    },
    delete: (key) => {
      data.delete(key);
    },
  };
  return { data, store };
}

describe("usePermissionPrompt", () => {
  it("renders nothing until something asks", () => {
    setup();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("shows the request and resolves with the answer, which stays on screen", async () => {
    const user = userEvent.setup();
    const { ask } = setup();
    const answer = ask(CALENDAR, REASON);

    await screen.findByRole("region", { name: HEADING });
    expect(
      screen.getByText("To find a free slot for the meeting you asked for."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Allow once" }));

    await expect(answer).resolves.toBe("once");
    expect(screen.getByText("Allowed once")).toBeInTheDocument();
    // Already answered, so there is nothing for Change to change.
    expect(screen.queryByRole("button", { name: "Change" })).not.toBeInTheDocument();
  });

  it("announces each request politely", async () => {
    const { ask, container } = setup();
    void ask(CONTACTS);
    await waitFor(() => {
      expect(status(container)).toHaveTextContent(
        "Permission request: Claude wants to read your contacts. Medium risk.",
      );
    });
  });

  it("shows one request at a time and says how many are waiting", async () => {
    const user = userEvent.setup();
    const { ask } = setup();
    const calendar = ask(CALENDAR);
    const contacts = ask(CONTACTS);

    await screen.findByRole("region", { name: HEADING });
    expect(await screen.findByText("1 more request waiting")).toBeInTheDocument();
    expect(screen.getAllByRole("region")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Don't allow" }));
    await expect(calendar).resolves.toBe("deny");
    expect(
      await screen.findByRole("region", { name: "Claude wants to read your contacts" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/more request/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Allow once" }));
    await expect(contacts).resolves.toBe("once");
  });

  it("remembers a session answer and resolves the next request without asking", async () => {
    const user = userEvent.setup();
    const { ask } = setup();
    const first = ask(CALENDAR);
    const second = ask(CALENDAR);

    await screen.findByText("1 more request waiting");
    await user.click(screen.getByRole("button", { name: "Allow for this session" }));

    await expect(first).resolves.toBe("session");
    await expect(second).resolves.toBe("session");
    expect(screen.getByLabelText("Grants")).toHaveTextContent("calendar.read:session");
    await expect(ask(CALENDAR)).resolves.toBe("session");
    expect(screen.getByText("Allowed for this session")).toBeInTheDocument();
  });

  it("asks again after revoke", async () => {
    const user = userEvent.setup();
    const { ask, api } = setup();
    const first = ask(CALENDAR);
    await user.click(await screen.findByRole("button", { name: "Allow for this session" }));
    await first;

    await act(async () => {
      await api().revoke("calendar.read");
    });
    expect(screen.getByLabelText("Grants")).toBeEmptyDOMElement();

    void ask(CALENDAR);
    expect(await screen.findByRole("button", { name: "Allow once" })).toBeInTheDocument();
  });

  it("offers Always allow only when there is a store to keep it", async () => {
    const { ask, unmount } = setup();
    void ask(CALENDAR);
    await screen.findByRole("region");
    expect(screen.queryByRole("button", { name: "Always allow" })).not.toBeInTheDocument();
    unmount();

    const withStore = setup({ store: memoryStore().store });
    void withStore.ask(CALENDAR);
    expect(await screen.findByRole("button", { name: "Always allow" })).toBeInTheDocument();
  });

  it("still leaves out Always allow for high risk, even with a store", async () => {
    const { ask } = setup({ store: memoryStore().store });
    void ask(SEND);
    await screen.findByRole("region");
    expect(screen.queryByRole("button", { name: "Always allow" })).not.toBeInTheDocument();
  });

  it("keeps always in the store, so a later mount does not ask", async () => {
    const user = userEvent.setup();
    const { data, store } = memoryStore();
    const first = setup({ store });
    const answer = first.ask(CALENDAR);
    await user.click(await screen.findByRole("button", { name: "Always allow" }));
    await expect(answer).resolves.toBe("always");
    expect(data.get("calendar.read#Work calendar")).toBe("always");
    first.unmount();

    const second = setup({ store });
    await expect(second.ask(CALENDAR)).resolves.toBe("always");
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Grants")).toHaveTextContent("calendar.read:always");
  });

  it("refuses requests still waiting when it unmounts", async () => {
    const { ask, unmount } = setup();
    const first = ask(CALENDAR);
    const second = ask(CONTACTS);
    await screen.findByRole("region");
    unmount();
    await expect(first).resolves.toBe("deny");
    await expect(second).resolves.toBe("deny");
  });

  describe("focus", () => {
    it("moves to the next request after answering from inside the prompt", async () => {
      const user = userEvent.setup();
      const { ask, container } = setup();
      void ask(CALENDAR);
      void ask(CONTACTS);
      await screen.findByText("1 more request waiting");

      screen.getByRole("button", { name: "Allow once" }).focus();
      await user.keyboard("{Enter}");

      const next = await screen.findByRole("region", {
        name: "Claude wants to read your contacts",
      });
      await waitFor(() => {
        expect(next).toHaveFocus();
      });
      // Focus already says it; the status region stays quiet.
      await pause();
      expect(status(container)).toBeEmptyDOMElement();
    });

    it("moves to the result when the last request is answered", async () => {
      const user = userEvent.setup();
      const { ask, container } = setup();
      void ask(CALENDAR);
      screen.getByRole("button", { name: "Elsewhere" }).focus();
      (await screen.findByRole("button", { name: "Don't allow" })).focus();
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(
          container.querySelector("[data-slot='permission-prompt-outcome']"),
        ).toHaveFocus();
      });
    });

    it("follows a new request that replaces a result the person is on", async () => {
      const user = userEvent.setup();
      const { ask } = setup();
      void ask(CALENDAR);
      (await screen.findByRole("button", { name: "Allow once" })).focus();
      await user.keyboard("{Enter}");
      await screen.findByText("Allowed once");

      void ask(CONTACTS);
      const next = await screen.findByRole("region", {
        name: "Claude wants to read your contacts",
      });
      await waitFor(() => {
        expect(next).toHaveFocus();
      });
    });

    it("never takes focus from someone who is elsewhere", async () => {
      const { ask } = setup();
      const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
      elsewhere.focus();
      void ask(CALENDAR);
      void ask(CONTACTS);
      await screen.findByRole("region");
      await pause();
      expect(elsewhere).toHaveFocus();
    });
  });

  it("has no violations with a request waiting behind the current one", async () => {
    const { ask, container } = setup();
    void ask(CALENDAR, REASON);
    void ask(SEND);
    await screen.findByText("1 more request waiting");
    await expectNoA11yViolations(container);
  });
});
