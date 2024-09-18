import { IO, AOProcess } from "@ar.io/sdk";
import { connect } from "@permaweb/aoconnect";

// Initialize variables
const AO_CU_URL = "https://cu.ar-io.dev";
const testnetProcessId = "agYcCFJtrMG6cqMuZfskIkFTGvUPddICmtQSBIoPdiA";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

const io = IO.init({
  process: new AOProcess({
    processId: testnetProcessId,
    ao: connect({
      CU_URL: AO_CU_URL,
    }),
  }),
});

const checkAccess = async (link) => {
  const cachedStatus = localStorage.getItem(`accessStatus_${link}`);
  if (cachedStatus) {
    const { status, errorType, timestamp } = JSON.parse(cachedStatus);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return { status, errorType };
    }
  }

  try {
    const response = await fetch(link);
    if (!response.ok) throw new Error(`Response status: ${response.status}`);
    const result = { status: true, errorType: null, timestamp: Date.now() };
    localStorage.setItem(`accessStatus_${link}`, JSON.stringify(result));
    return result;
  } catch (error) {
    const errorType = error.message.includes("ERR_CERT_DATE_INVALID")
      ? "invalid_cert"
      : error.message.includes("net::ERR_NAME_NOT_RESOLVED") ||
          error.message.includes("net::ERR_CONNECTION_REFUSED")
        ? "blocked_domain"
        : "unknown";
    const result = { status: false, errorType, timestamp: Date.now() };
    localStorage.setItem(`accessStatus_${link}`, JSON.stringify(result));
    return result;
  }
};

export const checkArNSRecord = async (domain) => {
  console.log("Undername result");
  console.log(await getUndername(domain));
  const cachedRecord = localStorage.getItem(`arnsRecord_${domain}`);
  if (cachedRecord) {
    const { exists, timestamp } = JSON.parse(cachedRecord);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return exists;
    }
  }

  try {
    // Allow underscores in the domain name
    const record = await io.getArNSRecord({ name: domain });
    const exists = record !== null;
    console.log("Found ArNS record:", domain);
    console.log(record);
    localStorage.setItem(
      `arnsRecord_${domain}`,
      JSON.stringify({ exists, timestamp: Date.now() }),
    );
    return exists;
  } catch (error) {
    console.error(`Error checking ArNS record for ${domain}:`, error);
    localStorage.setItem(
      `arnsRecord_${domain}`,
      JSON.stringify({ exists: false, timestamp: Date.now() }),
    );
    return false;
  }
};

const fetchAllGateways = async () => {
  const cachedGateways = localStorage.getItem("allGateways");
  if (cachedGateways) {
    const { gateways, timestamp } = JSON.parse(cachedGateways);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return gateways;
    }
  }

  try {
    const gateways = await io.getGateways();
    const sortedGateways = gateways.sort(
      (a, b) => b.operatorStake - a.operatorStake,
    );
    localStorage.setItem(
      "allGateways",
      JSON.stringify({ gateways: sortedGateways, timestamp: Date.now() }),
    );
    return sortedGateways;
  } catch (error) {
    console.error("Error fetching gateways:", error);
    return [];
  }
};

export const resolveArNSDomain = async (domain) => {
  const cachedResolution = localStorage.getItem(`arnsResolution_${domain}`);
  if (cachedResolution) {
    const { url, timestamp } = JSON.parse(cachedResolution);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return url;
    }
  }

  const recordExists = await checkArNSRecord(domain);
  if (!recordExists) {
    console.log(`ArNS record for ${domain} does not exist.`);
    return null;
  }

  const arIoLink = `https://${domain}.ar.io`;
  const arIoResult = await checkAccess(arIoLink);
  if (arIoResult.status) {
    localStorage.setItem(
      `arnsResolution_${domain}`,
      JSON.stringify({ url: arIoLink, timestamp: Date.now() }),
    );
    return arIoLink;
  }

  const sortedGateways = await fetchAllGateways();

  for (const gateway of sortedGateways) {
    if (gateway.settings?.fqdn) {
      // Allow underscores in the domain when constructing the link
      const link = `https://${domain}.${gateway.settings.fqdn}`;
      const result = await checkAccess(link);
      if (result.status) {
        localStorage.setItem(
          `arnsResolution_${domain}`,
          JSON.stringify({ url: link, timestamp: Date.now() }),
        );
        return link;
      }
    }
  }

  localStorage.setItem(
    `arnsResolution_${domain}`,
    JSON.stringify({ url: null, timestamp: Date.now() }),
  );
  return null;
};

export const getUndername = async (domain) => {
  try {
    const record = await io.getArNSRecord({ name: domain });
    if (record && record.processId) {
      console.log(record);
    }
    console.log(`No undername found for domain: ${domain}`);
    return null;
  } catch (error) {
    console.error(`Error getting undername for ${domain}:`, error);
    return null;
  }
};
