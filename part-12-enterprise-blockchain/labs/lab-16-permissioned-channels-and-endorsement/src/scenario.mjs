import { Organisation } from "./identity.mjs";
import { and, or } from "./endorsement.mjs";
import { Channel } from "./channel.mjs";

/** The consortium every command and the marker share. */
export function consortium() {
  const supplier = new Organisation("Supplier");
  const carrier = new Organisation("Carrier");
  const auditor = new Organisation("Auditor");
  return {
    supplier,
    carrier,
    auditor,
    ids: {
      sam: supplier.enrol("sam"),
      cara: carrier.enrol("cara"),
      ada: auditor.enrol("ada"),
      mallory: { org: "Supplier", commonName: "mallory", role: "client", serial: 99 },
    },
  };
}

/** Shipments need the supplier and either the carrier or the auditor. */
export const SHIPMENT_POLICY = and("Supplier", or("Carrier", "Auditor"));

export function shipmentChannel({ supplier, carrier, auditor }) {
  return new Channel("shipments", [supplier, carrier, auditor], SHIPMENT_POLICY);
}

/** A private channel the carrier is not part of. */
export function auditChannel({ supplier, auditor }) {
  return new Channel("audit", [supplier, auditor], "Auditor");
}

/** Deterministic chaincode: count one more shipment. */
export const recordShipment = (ctx) => {
  ctx.put("shipments", (ctx.get("shipments") ?? 0) + 1);
};
