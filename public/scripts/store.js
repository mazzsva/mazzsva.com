export const modes = ["all", "products", "projects", "profiles"];

export const initialState = { mode: "all", selection: -1, presented: false };

const wrap = (value, count) => ((value % count) + count) % count;

export function reduce(state, action, counts) {
  if (state.presented && action.type !== "dismiss") return state;

  switch (action.type) {
    case "show":
      return { ...initialState, mode: action.mode };
    case "switch":
      return { ...state, mode: modes[wrap(modes.indexOf(state.mode) + action.step, modes.length)], selection: 0 };
    case "select":
      return action.index === state.selection ? state : { ...state, selection: action.index };
    case "move": {
      const count = counts[state.mode];
      const start = action.step > 0 ? -1 : count;
      return { ...state, selection: wrap((state.selection < 0 ? start : state.selection) + action.step, count) };
    }
    case "present":
      return { ...state, selection: action.index, presented: true };
    case "dismiss":
      return state.presented ? { ...state, selection: -1, presented: false } : state;
    default:
      return state;
  }
}
