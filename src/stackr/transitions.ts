import { STF, Transitions } from "@stackr/sdk/machine";
import { CounterState } from "./machine";

type UpdateInput = {
  temperature: number;
  timestamp: number;
};

const update: STF<CounterState, UpdateInput> = {
  handler: ({ state, inputs }) => {
    state = inputs.temperature;
    return state;
  },
};

export const transitions: Transitions<CounterState> = {
  update,
};
