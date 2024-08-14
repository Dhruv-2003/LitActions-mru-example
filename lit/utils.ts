import { hashTypedData } from "viem";
// import { utils } from "ethers";
import { privateKeyToAccount } from "viem/accounts";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { ethers, JsonRpcProvider } from "ethers";
import { LitNetwork } from "@lit-protocol/constants";

const PRIVATE_KEY = process.env.PRIVATE_KEY as string;
console.log(PRIVATE_KEY);
if (!PRIVATE_KEY) {
  console.error("Please provide a private key");
  process.exit(1);
}

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

const account = privateKeyToAccount(
  "0x572cdf0dfa66a7a97d609e160e6c65f9675bda23805fbb2033295fc289f9f49e"
);

const main = async () => {
  const domain = {
    name: "Stackr MVP v0",
    version: "1",
    chainId: 9999999999,
    verifyingContract:
      "0x0000000000000000000000000000000000000000" as `0x${string}`,
    salt: "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" as `0x${string}`,
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
    temperature: 30,
    timestamp: Date.now(),
  };

  const viemHash = await hashTypedData({
    domain: domain,
    types: types,
    primaryType: "update-weather-data",
    message: payload,
  });
  console.log(viemHash);

  // const ethersHash = utils._TypedDataEncoder.hash(domain, types, payload);
  // console.log(ethersHash);

  const viemSignedTypedData = await account.signTypedData({
    domain: domain,
    types: types,
    primaryType: "update-weather-data",
    message: payload,
  });
  console.log(viemSignedTypedData);

  const viemSignature = await account.sign({ hash: viemHash });
  console.log(viemSignature);
};

main();
