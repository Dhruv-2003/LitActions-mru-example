import { ActionSchema, SolidityType } from "@stackr/sdk";

export const UpdateCounterSchema = new ActionSchema("update-weather-data", {
  temperature: SolidityType.UINT, // temperature in celsius
  timestamp: SolidityType.UINT,
});

export const schemas = {
  update: UpdateCounterSchema,
};
