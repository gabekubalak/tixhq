#pragma once
#include <stddef.h>
#include <stdint.h>

/* Frame format on the USB-CDC wire:
 *
 *   [ COBS-encoded( payload || crc16_le ) ] 0x00
 *
 *   - payload is JSON (UTF-8), one message per frame
 *   - crc16_le is CRC-16/CCITT-FALSE of the JSON payload, little-endian
 *   - the trailing 0x00 is the COBS sentinel
 *
 * Maximum payload size is 4 KiB; frames larger than that are dropped by the
 * receiver as malformed.
 */

#define GROVE_FRAME_MAX_PAYLOAD 4096
#define GROVE_FRAME_MAX_WIRE    (GROVE_FRAME_MAX_PAYLOAD + 32)

/* Convenience wrappers (encode payload+crc+sentinel into out buffer).
 * Returns wire length written, or 0 on error. */
size_t grove_frame_pack(const uint8_t *payload, size_t payload_len,
                        uint8_t *out, size_t out_cap);

/* Decodes one frame (without sentinel) into payload.
 * Verifies CRC. Returns payload length, or (size_t)-1 on CRC or COBS error. */
size_t grove_frame_unpack(const uint8_t *wire, size_t wire_len,
                          uint8_t *payload, size_t payload_cap);
