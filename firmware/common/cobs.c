#include "cobs.h"

size_t grove_cobs_encode(const uint8_t *in, size_t in_len,
                         uint8_t *out, size_t out_cap) {
    if (out_cap < in_len + (in_len / 254) + 1) return 0;

    size_t code_idx = 0;
    size_t out_idx = 1;
    uint8_t code = 1;

    for (size_t i = 0; i < in_len; i++) {
        if (in[i] == 0) {
            out[code_idx] = code;
            code_idx = out_idx++;
            code = 1;
        } else {
            out[out_idx++] = in[i];
            code++;
            if (code == 0xFF) {
                out[code_idx] = code;
                code_idx = out_idx++;
                code = 1;
            }
        }
    }
    out[code_idx] = code;
    return out_idx;
}

size_t grove_cobs_decode(const uint8_t *in, size_t in_len,
                         uint8_t *out, size_t out_cap) {
    size_t in_idx = 0;
    size_t out_idx = 0;

    while (in_idx < in_len) {
        uint8_t code = in[in_idx++];
        if (code == 0) return (size_t)-1;

        for (uint8_t i = 1; i < code; i++) {
            if (in_idx >= in_len || out_idx >= out_cap) return (size_t)-1;
            out[out_idx++] = in[in_idx++];
        }
        if (code != 0xFF && in_idx < in_len) {
            if (out_idx >= out_cap) return (size_t)-1;
            out[out_idx++] = 0;
        }
    }
    return out_idx;
}
