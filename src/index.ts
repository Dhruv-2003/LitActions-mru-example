import { ActionSchema, AllowedInputTypes, MicroRollup } from "@stackr/sdk";
import { HDNodeWallet, Wallet } from "ethers";
import { stackrConfig } from "../stackr.config.ts";
import { schemas } from "./stackr/action.ts";
import { machine } from "./stackr/machine.ts";
import express, { Request, Response } from "express";
import cors from "cors";
import { ActionEvents } from "@stackr/sdk";
import { transitions } from "./stackr/transitions.ts";

const app = express();
app.use(express.json());
app.use(cors());

const mru = await MicroRollup({
  config: stackrConfig,
  actionSchemas: [schemas.update],
  stateMachines: [machine],
  stfSchemaMap: {
    update: schemas.update,
  },
});

await mru.init();

const { actions, chain, events } = mru;

events.subscribe(ActionEvents.SUBMIT, (args) => {
  console.log("Submitted an action", args);
});

events.subscribe(ActionEvents.EXECUTION_STATUS, async (action) => {
  console.log("Submitted an action", action);
});

app.get("/actions/:hash", async (req: Request, res: Response) => {
  const { hash } = req.params;
  const action = await actions.getByHash(hash);
  if (!action) {
    return res.status(404).send({ message: "Action not found" });
  }
  return res.send(action);
});

app.get("/blocks/:hash", async (req: Request, res: Response) => {
  const { hash } = req.params;
  const block = await chain.getBlockByHash(hash);
  if (!block) {
    return res.status(404).send({ message: "Block not found" });
  }
  return res.send(block);
});

app.post("/:reducerName", async (req: Request, res: Response) => {
  const { reducerName } = req.params;
  const actionReducer = transitions[reducerName];

  if (!actionReducer) {
    res.status(400).send({ message: "̦̦no reducer for action" });
    return;
  }
  const action = reducerName as keyof typeof schemas;

  const { msgSender, signature, inputs } = req.body;

  const schema = schemas[action];

  try {
    const newAction = schema.actionFrom({ msgSender, signature, inputs });
    const ack = await mru.submitAction(reducerName, newAction);

    res.status(201).send({ ack });
  } catch (e: any) {
    res.status(400).send({ error: e.message });
  }
  return;
});

app.get("/getEIP712Types/:reducerName", (req: Request, res: Response) => {
  // @ts-ignore
  const { reducerName } = req.params;
  console.log(reducerName);

  const action = reducerName as keyof typeof schemas;
  console.log(action);

  const schema = schemas[action];
  console.log(schema);
  if (!schema) {
    res.status(400).send({ error: "no schema for action" });
    return;
  }
  try {
    const eip712Types = schema.EIP712TypedData.types;
    const domain = schema.domain;

    return res.send({ eip712Types, domain });
  } catch (e: any) {
    res.status(400).send({ error: e.message });
  }
});

app.get("/", (_req: Request, res: Response) => {
  return res.send({ state: machine?.state });
});

app.listen(5050, () => {
  console.log("listening on port 5050");
});
