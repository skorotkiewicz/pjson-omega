import { decode } from "../lib/pj";

const fetchPJSON = async () => {
  console.log("[CLIENT] Requesting data from server...");

  try {
    const response = await fetch("http://localhost:3001/data");
    const rawData = await response.text();

    console.log(`[CLIENT] Received raw PJSON: ${rawData}`);

    // Decode the high-density PJSON back into a JS Object
    const decoded = decode(rawData);

    console.log("[CLIENT] Decoded Data:");
    console.log(JSON.stringify(decoded, null, 2));
  } catch (error) {
    console.error(`[CLIENT] Connection Error: ${error}`);
  }
};

fetchPJSON();
