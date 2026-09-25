import { afterEach, describe, expect, it, vi } from "vitest";

import { completeSentences, estimateSpeechMs, splitSentences, toSpeakable } from "./speakable";

describe("toSpeakable", () => {
  it("summarises a closed code block instead of reading it", () => {
    const text = "Try this:\n```ts\nconst a = 1;\nconst b = 2;\n```\nThat is all.";
    expect(toSpeakable(text)).toBe("Try this:\nCode block, ts, 2 lines.\nThat is all.");
  });

  it("says one line, not one lines", () => {
    expect(toSpeakable("```\nls\n```")).toBe("Code block, 1 line.");
  });

  it("withholds an unclosed fence while streaming", () => {
    const text = "Here it is.\n```python\nprint('hi')\n";
    expect(toSpeakable(text, { streaming: true })).toBe("Here it is.\n");
  });

  it("summarises an unclosed fence once the stream has ended", () => {
    const text = "Here it is.\n```python\nprint('hi')\nprint('bye')";
    expect(toSpeakable(text)).toBe("Here it is.\nCode block, python, 2 lines.");
  });

  it("keeps link text and drops the URL", () => {
    expect(toSpeakable("See [the guide](https://example.com/guide).")).toBe("See the guide.");
  });

  it("describes an image by its alt text", () => {
    expect(toSpeakable("![A bar chart](chart.png)")).toBe("Image: A bar chart");
    expect(toSpeakable("![](spacer.png)")).toBe("");
  });

  it("drops heading, quote and list markers", () => {
    expect(toSpeakable("## Setup\n> Note\n- one\n* two")).toBe("Setup\nNote\none\ntwo");
  });

  it("drops emphasis, strikethrough and inline code marks", () => {
    expect(toSpeakable("This is **bold**, *soft*, ~~gone~~ and `code`.")).toBe(
      "This is bold, soft, gone and code.",
    );
  });

  it("leaves identifiers with underscores alone", () => {
    expect(toSpeakable("Set max_tokens and top_p.")).toBe("Set max_tokens and top_p.");
  });

  it("does not treat a lone asterisk as emphasis", () => {
    expect(toSpeakable("2 * 3 * 4")).toBe("2 * 3 * 4");
  });

  it("reads a table row as a list of cells and drops the separator", () => {
    expect(toSpeakable("| Plan | Price |\n| --- | ---: |\n| Pro | $20 |")).toBe(
      "Plan, Price\n\nPro, $20",
    );
  });

  it("drops horizontal rules", () => {
    expect(toSpeakable("Above\n---\nBelow")).toBe("Above\n\nBelow");
  });

  it("normalises Windows line endings", () => {
    expect(toSpeakable("a\r\nb")).toBe("a\nb");
  });
});

describe("splitSentences", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("splits on sentence boundaries and trims", () => {
    expect(splitSentences("One. Two? Three!")).toEqual(["One.", "Two?", "Three!"]);
  });

  it("does not split a decimal", () => {
    expect(splitSentences("It costs 3.50 now. Then more.")).toEqual([
      "It costs 3.50 now.",
      "Then more.",
    ]);
  });

  it("treats a line break as a boundary, so headings stand alone", () => {
    expect(splitSentences("Setup\nInstall it first.")).toEqual(["Setup", "Install it first."]);
  });

  it("falls back to punctuation when Intl.Segmenter is missing", () => {
    vi.stubGlobal("Intl", { ...Intl, Segmenter: undefined });
    expect(splitSentences("One. Two? Three")).toEqual(["One.", "Two?", "Three"]);
    expect(splitSentences("Heading\nBody.")).toEqual(["Heading", "Body."]);
  });

  it("survives a locale the platform rejects", () => {
    expect(splitSentences("One. Two.", "not a locale!!")).toEqual(["One.", "Two."]);
  });
});

describe("completeSentences", () => {
  it("holds back the last sentence while streaming", () => {
    expect(completeSentences("First. Second", { streaming: true })).toEqual(["First."]);
  });

  it("holds back a sentence that merely looks finished", () => {
    // "3." may yet become "3.5 million".
    expect(completeSentences("The total is 3.", { streaming: true })).toEqual([]);
  });

  it("releases everything once the stream ends", () => {
    expect(completeSentences("First. Second")).toEqual(["First.", "Second"]);
  });
});

describe("estimateSpeechMs", () => {
  it("scales with words at the given rate", () => {
    // 60 words at 240 wpm is a quarter of a minute.
    expect(estimateSpeechMs(Array(60).fill("word").join(" "), 240)).toBe(15_000);
  });

  it("never goes below a floor", () => {
    expect(estimateSpeechMs("Hi.", 1000)).toBe(400);
  });

  it("counts characters for script without spaces", () => {
    expect(
      estimateSpeechMs("这是一个很长的句子没有任何空格可以用来分词的例子啊", 240),
    ).toBeGreaterThan(400);
  });
});
