"""ClearPath-EC encoder reader over EtherCAT."""

from __future__ import annotations

import ctypes
import time
from dataclasses import dataclass
from typing import Iterator, Optional

try:
    import pysoem
except ImportError as exc:  # pragma: no cover - optional dependency
    pysoem = None
    _IMPORT_ERROR = exc
else:
    _IMPORT_ERROR = None

# CiA 402 objects used by ClearPath-EC.
INDEX_POSITION_ACTUAL = 0x6064
INDEX_VELOCITY_ACTUAL = 0x606C
INDEX_MECHANICAL_POSITION = 0x216F


@dataclass(frozen=True)
class EncoderSample:
    position_counts: int
    velocity_counts_per_sec: Optional[int] = None
    mechanical_position: Optional[int] = None
    timestamp_s: float = 0.0


class ClearPathEcEncoderReader:
    """Read encoder feedback from a ClearPath-EC motor via EtherCAT."""

    # Default TxPDO layout from the ClearPath-EC software reference.
    class _InputPdo(ctypes.Structure):
        _pack_ = 1
        _fields_ = [
            ("statusword", ctypes.c_uint16),
            ("mode_display", ctypes.c_int8),
            ("position_actual_value", ctypes.c_int32),
            ("velocity_actual_value", ctypes.c_int32),
            ("torque_actual_value", ctypes.c_int16),
        ]

    def __init__(
        self,
        interface: str,
        slave_index: int = 0,
        use_pdo: bool = True,
    ) -> None:
        if pysoem is None:
            raise ImportError(
                "pysoem is required for ClearPath-EC support. "
                "Install with: pip install pysoem"
            ) from _IMPORT_ERROR

        self.interface = interface
        self.slave_index = slave_index
        self.use_pdo = use_pdo
        self._master: Optional[pysoem.Master] = None

    def open(self) -> None:
        master = pysoem.Master()
        if not master.open(self.interface):
            raise OSError(f"Could not open EtherCAT interface '{self.interface}'")

        if master.config_init() <= 0:
            master.close()
            raise RuntimeError(f"No EtherCAT slaves found on '{self.interface}'")

        if self.slave_index < 0 or self.slave_index >= len(master.slaves):
            master.close()
            raise IndexError(
                f"Slave index {self.slave_index} is out of range "
                f"(found {len(master.slaves)} slave(s))"
            )

        master.config_map()
        master.state = pysoem.SAFEOP_STATE
        master.write_state()
        master.state_check(pysoem.SAFEOP_STATE, 5_000_000)

        master.state = pysoem.OP_STATE
        master.write_state()
        master.state_check(pysoem.OP_STATE, 5_000_000)

        self._master = master

    def close(self) -> None:
        if self._master is None:
            return

        self._master.state = pysoem.INIT_STATE
        self._master.write_state()
        self._master.close()
        self._master = None

    def __enter__(self) -> "ClearPathEcEncoderReader":
        self.open()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()

    @property
    def slave(self):
        if self._master is None:
            raise RuntimeError("EtherCAT master is not open")
        return self._master.slaves[self.slave_index]

    def read_once(self) -> EncoderSample:
        if self._master is None:
            raise RuntimeError("EtherCAT master is not open")

        if self.use_pdo:
            self._master.send_processdata()
            self._master.receive_processdata(2_000)
            payload = bytes(self.slave.input)
            if len(payload) < ctypes.sizeof(self._InputPdo):
                raise RuntimeError(
                    f"Unexpected PDO size ({len(payload)} bytes). "
                    "Try --sdo mode or verify the slave PDO mapping."
                )
            pdo = self._InputPdo.from_buffer_copy(payload)
            return EncoderSample(
                position_counts=int(pdo.position_actual_value),
                velocity_counts_per_sec=int(pdo.velocity_actual_value),
                timestamp_s=time.time(),
            )

        position = self._read_sdo_int(INDEX_POSITION_ACTUAL)
        velocity = self._read_sdo_int(INDEX_VELOCITY_ACTUAL)
        mechanical = self._try_read_sdo_int(INDEX_MECHANICAL_POSITION)
        return EncoderSample(
            position_counts=position,
            velocity_counts_per_sec=velocity,
            mechanical_position=mechanical,
            timestamp_s=time.time(),
        )

    def stream(self, rate_hz: float) -> Iterator[EncoderSample]:
        if rate_hz <= 0:
            raise ValueError("rate_hz must be positive")

        period_s = 1.0 / rate_hz
        while True:
            start = time.perf_counter()
            yield self.read_once()
            elapsed = time.perf_counter() - start
            sleep_s = period_s - elapsed
            if sleep_s > 0:
                time.sleep(sleep_s)

    def _read_sdo_int(self, index: int, subindex: int = 0) -> int:
        raw = self.slave.sdo_read(index, subindex)
        if len(raw) < 4:
            raise RuntimeError(f"SDO 0x{index:04X}:{subindex} returned {len(raw)} bytes")
        return int.from_bytes(raw[:4], byteorder="little", signed=True)

    def _try_read_sdo_int(self, index: int, subindex: int = 0) -> Optional[int]:
        try:
            return self._read_sdo_int(index, subindex)
        except Exception:
            return None
