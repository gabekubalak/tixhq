#pragma once
#include <stddef.h>
#include <stdint.h>

/* Consistent Overhead Byte Stuffing.
 * Encode/decode in-place is NOT supported; output buffers must be distinct.
 * For an input of length n, the encoded length is at most n + n/254 + 1.
 * Frames are terminated by a 0x00 sentinel byte appended by the caller. */

size_t grove_cobs_encode(const uint8_t *in, size_t in_len,
                         uint8_t *out, size_t out_cap);

/* Returns decoded length on success, or (size_t)-1 if the frame is malformed.
 * The sentinel 0x00 must NOT be included in `in`. */
size_t grove_cobs_decode(const uint8_t *in, size_t in_len,
                         uint8_t *out, size_t out_cap);
