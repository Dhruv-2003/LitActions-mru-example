# Integration Guide: Lit Actions with Stackr Micro Rollups (MRU)

## Overview

This guide provides instructions on integrating Lit Actions with Stackr Micro Rollups (MRU) to build a weather oracle application. Follow the steps to set up an MRU, create Lit Actions, and execute them to update the rollup state with weather data.


## Prerequisites

- Basic understanding of Stackr Micro Rollups and Lit Protocol.
- Basic knowledge of JavaScript and Solidity.
- Development environment set up for MRU and Lit Actions.


## How to build ?

### Step 1: Initialize the Rollup

1. Initialise an MRU: Start by initialising MRU using the `@stackr/cli` and selecting the basic counter template, and adding a name for your project.

```bash
$ npx @stackr/cli@latest init

        _             _                        _ _
    ___| |_ __ _  ___| | ___ __            ___| (_)
   / __| __/ _` |/ __| |/ / '__|  _____   / __| | |
   \__ \ || (_| | (__|   <| |    |_____| | (__| | |
   |___/\__\__,_|\___|_|\_\_|             \___|_|_|
 

? Pick a template > counter
? Project Name > weather-mru

$ cd weather-mru
```

2. Configure the State & Implement the required actions schema: Implement a new action schema to update the weather data

```typescript
export const UpdateWeatherSchema = new ActionSchema("update-weather-data", {
  temperature: SolidityType.UINT, // temperature in celsius
  timestamp: SolidityType.UINT,
});
```

3. Implement a new State transition function for updating the weather data

```typescript
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
```

4 . The MRU needs to have express server attached to it , to expose the endpoints for submitting the actions from the frontend to the MRU. `token-transfer` template comes by default with the express app endpoints. 

```bash
npm install express
```

```typescript
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors())
app.use(express.json())

app.post("/:reducerName", async (req: Request, res: Response) => {
  const { reducerName } = req.params;
  const actionReducer = transitions[reducerName];

  if (!actionReducer) {
    res.status(400).send({ message: "No reducer for action" });
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

app.listen(5050, () => console.log('Server running on port 5050'));
```

### Step 2 Creating Lit Actions

1. Mint a PKP: Create a Programmable Key Pair (PKP) for signing actions.

```typescript
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { LitNetwork } from "@lit-protocol/constants";


const mintPkp = async () => {
  const provider = new JsonRpcProvider(
    "https://yellowstone-rpc.litprotocol.com"
  );
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const contractClient = new LitContracts({
    signer: wallet,
    network: LitNetwork.DatilDev,
  });
  await contractClient.connect();

  try {
    console.log("✅ Connected LitContracts client to network");

    console.log("🔄 Minting new PKP...");
    const pkp = (await contractClient.pkpNftContractUtils.write.mint()).pkp;
    console.log(
      `✅ Minted new PKP with public key: ${pkp.publicKey} and ETH address: ${pkp.ethAddress}`
    );
    return pkp;
  } catch (error) {
  } finally {
  }
};

```

2. Write Action Logic: Add the logic to fetch weather data, prepare an MRU action, and sign it with Lit nodes.

```typescript
onst sigName = "weatherOracleUdpate";

  console.log("🔄 Fetching weather data...");
  const url = "https://api.weather.gov/gridpoints/TOP/31,80/forecast";
  const resp = await fetch(url).then((response) => response.json());
  const temp = resp.properties.periods[0].temperature;
  console.log(temp);
  console.log("✅ Fetched weather data");

  const domain = {
    name: "Stackr MVP v0",
    version: "1",
    chainId: 9999999999,
    verifyingContract: "0x0000000000000000000000000000000000000000",
    salt: "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  };

  const types = {
    "update-weather-data": [
      {
        name: "temperature",
        type: "uint256",
      },
      {
        name: "timestamp",
        type: "uint256",
      },
    ],
  };

  const primaryType = Object.keys(types)[0];

  const payload = {
    temperature: temp,
    timestamp: Date.now(),
  };

  const hash = ethers.utils._TypedDataEncoder.hash(domain, types, payload);

  const toSign = await new TextEncoder().encode(hash);

  console.log("🔄 Signing Actions data...");
  const signature = await Lit.Actions.signEcdsa({
    toSign,
    publicKey,
    sigName,
  });
  console.log("✅ Signed Actions data");
```

3. RunOnce API Call: Use the runOnce API to execute the Lit Action, combining signatures from all Lit nodes.

```typescript
const body = JSON.stringify({
    msgSender: publicKey,
    signature,
    inputs: payload,
  });

  const actionName = "update";

  console.log("🔄 Sending action...");
  let res = await Lit.Actions.runOnce(
    { waitForResponse: true, name: "actionSender" },
    async () => {
      const res = await fetch(`${mruURL}/${actionName}`, {
        method: "POST",
        body,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const json = await res.json();
      const ack = json.ack;
      return ack.hash;
    }
  );
  console.log("✅ Sent action");

  Lit.Actions.setResponse({ response: res });
```

### Step 3 Executing the Action with Lit

1. Get Session Signature: Obtain a session signature from the Lit nodes to validate the action along with an authentication signature using the PKP for the interaction.


```typescript
const client = new LitJsSdk.LitNodeClient({
    alertWhenUnauthorized: false,
    litNetwork: LitNetwork.DatilTest,
  });

  await client.connect();
  console.log("✅ Connected to Lit network");

  const provider = new JsonRpcProvider(
    "https://yellowstone-rpc.litprotocol.com"
  );
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  try {
    const resourceAbilities = [
      {
        resource: new LitPKPResource("*"),
        ability: LitAbility.PKPSigning,
      },
      {
        resource: new LitActionResource("*"),
        ability: LitAbility.LitActionExecution,
      },
    ];

    console.log("🔄 Getting Session Key Pair...");


    const sessionKeyPair = client.getSessionKey();

    console.log("🔄 Getting Session Signatures...");

    const sessionSigs = await client.getSessionSigs({
      chain: "ethereum",
      expiration: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      resourceAbilityRequests: resourceAbilities,
      authNeededCallback: async ({
        uri,
        expiration,
        resourceAbilityRequests,
      }) => {
        const toSign = await createSiweMessageWithRecaps({
          uri: uri!,
          expiration: expiration!,
          resources: resourceAbilityRequests!,
          walletAddress: wallet.address,
          nonce: await client.getLatestBlockhash(),
          litNodeClient: client,
        });

        return await generateAuthSig({
          signer: wallet,
          toSign,
        });
      },
    });
    console.log("✅ Got Session Signatures");

```

2. Execute Lit Action: Execute the Lit Actions JavaScript code on the nodes to update the MRU with weather data.

```typescript
console.log("🔄 Executing Lit Action...");

    const res = await client.executeJs({
      code: litActionCode,
      sessionSigs,
      jsParams: {
        publicKey: mintInfo.pkp.publicKey,
        mruURL: MRU_URL,
      },
    });
    console.log("✅ Executed Lit Action");

```

## Project Structure 

```
├── src
│   ├── stackr
│   │   ├── machine.ts 
│   │   ├── actions.ts 
│   │   ├── transitions.ts
│   │ 
│   ├── index.ts
│   
├── lit
│   ├── index.ts
│   ├── action.ts
│   ├── utils.ts
│   
│── stackr.config.ts
│── deployment.json
```

## How to run MRU ?

### Run using Node.js :rocket:

```bash
npm start
```

### Expose localhost endpoint with ngrok

```bash
ngrok http http://localhost:5050
```

Add the ngrok endpoint link in the index with `MRU_URL`

## How to run the lit action ?

### Run using command after you start the MRU :

```bash
bun run lit/index.ts
```
