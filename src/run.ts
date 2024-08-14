import { ActionSchema, AllowedInputTypes, MicroRollup } from "@stackr/sdk";
import { HDNodeWallet, Wallet } from "ethers";
import { UpdateCounterSchema } from "./stackr/action";

const wallet = Wallet.createRandom();

const signMessage = async (
  wallet: HDNodeWallet,
  schema: ActionSchema,
  payload: AllowedInputTypes
) => {
  const signature = await wallet.signTypedData(
    schema.domain,
    schema.EIP712TypedData.types,
    payload
  );
  return signature;
};

const main = async () => {
  try {
    const actionName = "update";
    console.log("Sending action");
    const response = await fetch(
      `http://localhost:5050/getEIP712Types/${actionName}`
    );

    const data = (await response.json()) as any;
    const eip712Types = data.eip712Types;
    console.log(eip712Types);

    const domain = data.domain;
    console.log(domain);

    const payload = {
      temperature: 30,
      timestamp: Date.now(),
    };

    console.log(payload);

    console.log("Signing action");
    const signature = await wallet.signTypedData(domain, eip712Types, payload);

    console.log(`Signature for the create action for rollup : ${signature}`);

    const body = JSON.stringify({
      msgSender: wallet.address,
      signature,
      inputs: payload,
    });

    const res = await fetch(`http://localhost:5050/${actionName}`, {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/json",
      },
    });
    console.log("Action sent");

    const json = await res.json();
    console.log(`Response: ${JSON.stringify(json, null, 2)}`);
    console.log(json);
  } catch (e) {
    console.error(e);
  }
};

main();
