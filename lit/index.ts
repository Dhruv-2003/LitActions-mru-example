import * as LitJsSdk from "@lit-protocol/lit-node-client";
import {
  AuthMethodScope,
  AuthMethodType,
  LitNetwork,
} from "@lit-protocol/constants";
import { ethers, JsonRpcProvider } from "ethers";
import siwe from "siwe";
import {
  createSiweMessageWithRecaps,
  generateAuthSig,
  LitAbility,
  LitActionResource,
  LitPKPResource,
} from "@lit-protocol/auth-helpers";
import fs from "fs";
import dotenv from "dotenv";
import { litActionCode } from "./action";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY as string;
console.log(PRIVATE_KEY);
if (!PRIVATE_KEY) {
  console.error("Please provide a private key");
  process.exit(1);
}

const MRU_URL =
  "https://c89c-2405-201-2008-d8d0-a869-5824-158-4f14.ngrok-free.app";

const main = async () => {
  console.log("🔄 Connecting to Lit network...");

  const client = new LitJsSdk.LitNodeClient({
    alertWhenUnauthorized: false,
    litNetwork: LitNetwork.DatilDev,
  });

  await client.connect();
  console.log("✅ Connected to Lit network");

  const provider = new JsonRpcProvider(
    "https://yellowstone-rpc.litprotocol.com"
  );
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  try {
    const mintInfo = {
      pkp: {
        tokenId:
          "0x6925841309682a81fd97fc8cc31ef33146223a4b41f8560a98cc7dbb3539c1db",
        publicKey:
          "044407ebe4d92a524005023ce4b6578b03bfc13f06490b96bda7ed8f1b0ea111b6276aa2fda117992a2f109e9f1c2e23809588334db6854d12e84b08863bc8808e",
        ethAddress: "0x9eb72f11B55C24C85C8AB9790d3C1F8859235067",
      },
    };

    // Set resources to allow for signing of any message.
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

    // Get the session key for the session signing request
    // will be accessed from local storage or created just in time.
    const sessionKeyPair = client.getSessionKey();

    console.log("🔄 Getting Session Signatures...");

    // Request a session with the callback to sign
    // with an EOA wallet from the custom auth needed callback created above.
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

    console.log(res);

    console.log("signatures: ", res.signatures);
    console.log("logs: ", res.logs);
    console.log("response: ", res.response);
  } catch (error) {
    console.error("error", error);
  } finally {
    console.log("Disconnecting with the client...");
    await client.disconnect();
  }
};

main();
