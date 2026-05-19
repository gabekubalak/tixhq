#include "frame.h"
#include "cobs.h"
#include "crc16.h"

#include <string.h>

size_t grove_frame_pack(const uint8_t *payload, size_t payload_len,
                        uint8_t *out, size_t out_cap) {
    if (payload_len > GROVE_FRAME_MAX_PAYLOAD) return 0;

    uint8_t buf[GROVE_FRAME_MAX_PAYLOAD + 2];
    memcpy(buf, payload, payload_len);
    uint16_t crc = grove_crc16(payload, payload_len);
    buf[payload_len]     = (uint8_t)(crc & 0xFF);
    buf[payload_len + 1] = (uint8_t)((crc >> 8) & 0xFF);

    size_t enc_len = grove_cobs_encode(buf, payload_len + 2, out, out_cap - 1);
    if (enc_len == 0) return 0;
    out[enc_len] = 0x00;
    return enc_len + 1;
}

size_t grove_frame_unpack(const uint8_t *wire, size_t wire_len,
                          uint8_t *payload, size_t payload_cap) {
    uint8_t buf[GROVE_FRAME_MAX_PAYLOAD + 2];
    size_t dec = grove_cobs_decode(wire, wire_len, buf, sizeof(buf));
    if (dec == (size_t)-1 || dec < 2) return (size_t)-1;

    size_t body_len = dec - 2;
    uint16_t crc_wire = (uint16_t)buf[body_len] | ((uint16_t)buf[body_len + 1] << 8);
    uint16_t crc_calc = grove_crc16(buf, body_len);
    if (crc_wire != crc_calc) return (size_t)-1;
    if (body_len > payload_cap) return (size_t)-1;

    memcpy(payload, buf, body_len);
    return body_len;
}
