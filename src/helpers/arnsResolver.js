import { IO, AOProcess } from "@ar.io/sdk";
import { connect } from "@permaweb/aoconnect";

// Initialize variables
const AO_CU_URL = "https://cu.ar-io.dev";
const testnetProcessId = "agYcCFJtrMG6cqMuZfskIkFTGvUPddICmtQSBIoPdiA";

const io = IO.init({
  process: new AOProcess({
    processId: testnetProcessId,
    ao: connect({
      CU_URL: AO_CU_URL,
    }),
  }),
});

// const io = IO.init();

const checkAccess = async (link) => {
  const cachedStatus = localStorage.getItem(`accessStatus_${link}`);
  if (cachedStatus) return JSON.parse(cachedStatus);

  try {
    const response = await fetch(link);
    if (!response.ok) throw new Error(`Response status: ${response.status}`);
    const result = { status: true, errorType: null };
    localStorage.setItem(`accessStatus_${link}`, JSON.stringify(result));
    return result;
  } catch (error) {
    const errorType = error.message.includes("ERR_CERT_DATE_INVALID")
      ? "invalid_cert"
      : error.message.includes("net::ERR_NAME_NOT_RESOLVED") ||
          error.message.includes("net::ERR_CONNECTION_REFUSED")
        ? "blocked_domain"
        : "unknown";
    const result = { status: false, errorType };
    localStorage.setItem(`accessStatus_${link}`, JSON.stringify(result));
    return result;
  }
};

export const checkArNSRecord = async (domain) => {
  try {
    const record = await io.getArNSRecord({ name: domain });
    console.log("Found ArNS record:" + domain);
    return record !== null;
  } catch (error) {
    console.error(`Error checking ArNS record for ${domain}:`, error);
    return false;
  }
};

const fetchAllGateways = async () => {
  try {
    const gateways = await io.getGateways();
    return gateways.sort((a, b) => b.operatorStake - a.operatorStake);
  } catch (error) {
    console.error("Error fetching gateways:", error);
    return [];
  }
};

export const resolveArNSDomain = async (domain) => {
  const recordExists = await checkArNSRecord(domain);
  if (!recordExists) {
    console.log(`ArNS record for ${domain} does not exist.`);
    return null;
  }

  const arIoLink = `https://${domain}.ar.io`;
  const arIoResult = await checkAccess(arIoLink);
  if (arIoResult.status) {
    return arIoLink;
  }

  const sortedGateways = await fetchAllGateways();

  for (const gateway of sortedGateways) {
    if (gateway.settings?.fqdn) {
      const link = `https://${domain}.${gateway.settings.fqdn}`;
      const result = await checkAccess(link);
      if (result.status) {
        return link;
      }
    }
  }

  return null;
};
