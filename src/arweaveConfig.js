import Arweave from "arweave";
import { arGql } from "ar-gql";

const arweaveInstance = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

const arGqlInstance = arGql();

export { arweaveInstance, arGqlInstance };
