/**
 * Xendit Payment Provider Plugin for Medusa v2
 *
 * This file exports the plugin definition following Medusa v2 plugin structure.
 * It enables the Xendit payment provider to be used as a Medusa plugin.
 *
 * Reference: https://docs.medusajs.com/learn/fundamentals/plugins/create
 */

export { default as XenditProviderService } from "./providers/xendit";
export * from "./providers/xendit/types";
