import { IO, AOProcess } from "@ar.io/sdk";
import { connect } from "@permaweb/aoconnect";
import { cacheModule } from "./cacheModule";

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

const checkAccess = async (link) => {
  const cachedStatus = cacheModule.get(`accessStatus_${link}`, "arns");
  if (cachedStatus) {
    return cachedStatus;
  }

  try {
    const response = await fetch(link);
    if (!response.ok) throw new Error(`Response status: ${response.status}`);
    const result = { status: true, errorType: null };
    cacheModule.set(`accessStatus_${link}`, result, "arns");
    return result;
  } catch (error) {
    const errorType = error.message.includes("ERR_CERT_DATE_INVALID")
      ? "invalid_cert"
      : error.message.includes("net::ERR_NAME_NOT_RESOLVED") ||
          error.message.includes("net::ERR_CONNECTION_REFUSED")
        ? "blocked_domain"
        : "unknown";
    const result = { status: false, errorType };
    cacheModule.set(`accessStatus_${link}`, result, "arns");
    return result;
  }
};

export const checkArNSRecord = async (domain) => {
  const cachedRecord = cacheModule.get(`arnsRecord_${domain}`, "arns");
  if (cachedRecord !== null) {
    return cachedRecord;
  }

  try {
    const record = await io.getArNSRecord({ name: domain });
    const exists = record !== null;

    cacheModule.set(`arnsRecord_${domain}`, exists, "arns");
    return exists;
  } catch (error) {
    console.error(`Error checking ArNS record for ${domain}:`, error);
    cacheModule.set(`arnsRecord_${domain}`, false, "arns");
    return false;
  }
};

const fetchAllGateways = async () => {
  const cachedGateways = cacheModule.get("allGateways", "arns");
  if (cachedGateways) {
    return cachedGateways;
  }

  try {
    const gateways = await io.getGateways();
    const sortedGateways = gateways.sort(
      (a, b) => b.operatorStake - a.operatorStake,
    );
    cacheModule.set("allGateways", sortedGateways, "arns");
    return sortedGateways;
  } catch (error) {
    console.error("Error fetching gateways:", error);
    return [];
  }
};

export const resolveArNSDomain = async (domain) => {
  const cachedResolution = cacheModule.get(`arnsResolution_${domain}`, "arns");
  if (cachedResolution) {
    return cachedResolution;
  }

  const recordExists = await checkArNSRecord(domain);
  if (!recordExists) {
    console.log(`ArNS record for ${domain} does not exist.`);
    return null;
  }

  const arIoLink = `https://${domain}.ar.io`;
  const arIoResult = await checkAccess(arIoLink);
  if (arIoResult.status) {
    cacheModule.set(`arnsResolution_${domain}`, arIoLink, "arns");
    return arIoLink;
  }

  const sortedGateways = await fetchAllGateways();

  for (const gateway of sortedGateways) {
    if (gateway.settings?.fqdn) {
      const link = `https://${domain}.${gateway.settings.fqdn}`;
      const result = await checkAccess(link);
      if (result.status) {
        cacheModule.set(`arnsResolution_${domain}`, link, "arns");
        return link;
      }
    }
  }

  cacheModule.set(`arnsResolution_${domain}`, null, "arns");
  return null;
};
