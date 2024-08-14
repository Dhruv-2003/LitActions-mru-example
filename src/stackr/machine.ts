import { State, StateMachine } from "@stackr/sdk/machine";
import { solidityPackedKeccak256 } from "ethers";

import * as genesisState from "../../genesis-state.json";
import { transitions } from "./transitions";

// state is just the number for temperature
export class CounterState extends State<number> {
  constructor(state: number) {
    super(state);
  }

  getRootHash() {
    return solidityPackedKeccak256(["uint256"], [this.state]);
  }
}

const machine = new StateMachine({
  id: "weather-oracle",
  stateClass: CounterState,
  initialState: genesisState.state,
  on: transitions,
});

export { machine };
