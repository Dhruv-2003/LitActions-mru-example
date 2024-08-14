// @ts-nocheck
// {
//   args: {
//     mruURL: "",
//     publicKey: ""
//   }
// }

const _litActionCode = async () => {
  const sigName = "weatherOracleUdpate";

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
};

export const litActionCode = `(${_litActionCode.toString()})();`;
