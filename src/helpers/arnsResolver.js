import { cacheModule } from "./cacheModule";
import { buildGatewayUrl } from "./gatewayService";

// Lazy load ARIO SDK to reduce initial bundle size
let ario = null;
const getARIO = async () => {
  if (!ario) {
    const { ARIO } = await import("@ar.io/sdk/web");
    ario = ARIO.mainnet();
  }
  return ario;
};

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
    const arioInstance = await getARIO();
    const record = await arioInstance.getArNSRecord({ name: domain });
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
    let allGateways = [];
    let nextCursor = null;

    do {
      const arioInstance = await getARIO();
      const gatewaysData = await arioInstance.getGateways({ cursor: nextCursor });
      console.log("Fetched gateways data:", gatewaysData);

      if (gatewaysData && Array.isArray(gatewaysData.items)) {
        allGateways = allGateways.concat(gatewaysData.items);
        nextCursor = gatewaysData.nextCursor;
      } else {
        console.error("Unexpected gateways data structure:", gatewaysData);
        break;
      }
    } while (nextCursor);

    console.log(`Total gateways fetched: ${allGateways.length}`);

    const sortedGateways = allGateways.sort((a, b) => {
      // Convert operatorStake to number to ensure proper comparison
      const stakeA = Number(a.operatorStake);
      const stakeB = Number(b.operatorStake);
      // Sort in descending order
      return stakeB - stakeA;
    });

    console.log("Top 5 gateways by operatorStake:", sortedGateways.slice(0, 5));
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

  try {
    // First, try the .ar.io domain
    const arIoLink = `https://${domain}.ar.io`;
    console.log(`Checking .ar.io gateway: ${arIoLink}`);
    const arIoResult = await checkAccess(arIoLink);
    if (arIoResult.status) {
      console.log(`Accessible .ar.io gateway found: ${arIoLink}`);
      cacheModule.set(`arnsResolution_${domain}`, arIoLink, "arns");
      return arIoLink;
    }

    // If .ar.io is not accessible, try other gateways
    const sortedGateways = await fetchAllGateways();
    console.log("Sorted gateways:", sortedGateways);

    for (const gateway of sortedGateways) {
      if (gateway.settings?.fqdn) {
        const link = `https://${domain}.${gateway.settings.fqdn}`;
        console.log(`Checking gateway: ${link}`);
        const result = await checkAccess(link);
        if (result.status) {
          console.log(`Accessible gateway found: ${link}`);
          cacheModule.set(`arnsResolution_${domain}`, link, "arns");
          return link;
        }
      }
    }

    console.log(`No accessible gateway found for ${domain}`);
    cacheModule.set(`arnsResolution_${domain}`, null, "arns");
    return null;
  } catch (error) {
    console.error(`Error resolving ArNS domain ${domain}:`, error);
    return null;
  }
};

export const resolveTx = async (tx) => {
  const cachedResolution = cacheModule.get(`txResolution_${tx}`, "arns");
  if (cachedResolution) {
    return cachedResolution;
  }

  try {
    // First, try the optimal gateway selected by Wayfinder
    const optimalLink = await buildGatewayUrl(tx);
    console.log(`Checking optimal gateway for tx: ${optimalLink}`);
    const optimalResult = await checkAccess(optimalLink);
    if (optimalResult.status) {
      console.log(`Accessible optimal gateway found for tx: ${optimalLink}`);
      cacheModule.set(`txResolution_${tx}`, optimalLink, "arns");
      return optimalLink;
    }

    // If .ar.io is not accessible, try other gateways
    const sortedGateways = await fetchAllGateways();
    console.log("Sorted gateways:", sortedGateways);

    for (const gateway of sortedGateways) {
      if (gateway.settings?.fqdn) {
        const link = `https://${gateway.settings.fqdn}/${tx}`;
        console.log(`Checking gateway for tx: ${link}`);
        const result = await checkAccess(link);
        if (result.status) {
          console.log(`Accessible gateway found for tx: ${link}`);
          cacheModule.set(`txResolution_${tx}`, link, "arns");
          return link;
        }
      }
    }

    console.log(`No accessible gateway found for tx ${tx}`);
    cacheModule.set(`txResolution_${tx}`, null, "arns");
    return null;
  } catch (error) {
    console.error(`Error resolving tx ${tx}:`, error);
    return null;
  }
};
