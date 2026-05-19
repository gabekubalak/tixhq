#pragma once
#include <stddef.h>
#include <stdint.h>

/* CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF, no reflection, no xorout.
 * Used as the trailer on every MCU<->Jetson frame, little-endian. */
uint16_t grove_crc16(const uint8_t *data, size_t len);
