# firmware/common

Shared C sources for every ESP32-S3 in the appliance.

| File          | Purpose                                                       |
|---------------|---------------------------------------------------------------|
| `cobs.{h,c}`  | Consistent Overhead Byte Stuffing — framing                   |
| `crc16.{h,c}` | CRC-16/CCITT-FALSE — frame integrity                          |
| `frame.{h,c}` | Pack/unpack helpers wrapping COBS + CRC                       |

A matching Python implementation lives in
`services/sensor-ingest/sensor_ingest/frame.py` and is the canonical
reference for the wire format.
