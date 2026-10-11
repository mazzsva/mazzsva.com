import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { initialState, reduce } from "../public/scripts/store.js";

const counts = { all: 5, products: 1, projects: 2, profiles: 2 };

const send = (state, action) => reduce(state, action, counts);

describe("show", () => {
  test("shows the mode and clears the selection", () => {
    const state = { mode: "all", selection: 3, presented: false };
    assert.deepEqual(send(state, { type: "show", mode: "projects" }), { mode: "projects", selection: -1, presented: false });
  });
});

describe("switch", () => {
  test("goes to the next mode and selects the first result", () => {
    assert.deepEqual(send(initialState, { type: "switch", step: 1 }), { mode: "products", selection: 0, presented: false });
  });

  test("wraps from the first mode to the last mode", () => {
    assert.deepEqual(send(initialState, { type: "switch", step: -1 }), { mode: "profiles", selection: 0, presented: false });
  });
});

describe("select", () => {
  test("selects the result", () => {
    assert.equal(send(initialState, { type: "select", index: 2 }).selection, 2);
  });

  test("returns the same state when the result is already selected", () => {
    const state = { ...initialState, selection: 2 };
    assert.equal(send(state, { type: "select", index: 2 }), state);
  });
});

describe("move", () => {
  test("down with no selection selects the first result", () => {
    assert.equal(send(initialState, { type: "move", step: 1 }).selection, 0);
  });

  test("up with no selection selects the last result", () => {
    assert.equal(send(initialState, { type: "move", step: -1 }).selection, 4);
  });

  test("wraps from the last result to the first result", () => {
    const state = { ...initialState, mode: "projects", selection: 1 };
    assert.equal(send(state, { type: "move", step: 1 }).selection, 0);
  });
});

describe("present", () => {
  test("selects the result and presents the sheet", () => {
    assert.deepEqual(send(initialState, { type: "present", index: 1 }), { mode: "all", selection: 1, presented: true });
  });

  test("ignores all actions except dismiss while the sheet is presented", () => {
    const state = { ...initialState, selection: 1, presented: true };
    for (const action of [{ type: "show", mode: "products" }, { type: "switch", step: 1 }, { type: "select", index: 0 }, { type: "move", step: 1 }]) {
      assert.equal(send(state, action), state);
    }
  });
});

describe("dismiss", () => {
  test("dismisses the sheet and clears the selection", () => {
    const state = { ...initialState, selection: 1, presented: true };
    assert.deepEqual(send(state, { type: "dismiss" }), initialState);
  });

  test("returns the same state when no sheet is presented", () => {
    assert.equal(send(initialState, { type: "dismiss" }), initialState);
  });
});
