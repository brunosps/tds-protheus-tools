#!/usr/bin/python3
"""Decompress TOTVS Protheus .ch include files (raw zlib / deflate).

Reads every file in <origin> and writes the inflated content to <dest>,
operating purely on bytes so the original Windows-1252 (cp1252) encoding of
the includes is preserved verbatim (no decode/encode step).

Usage:
    decompress_ch.py <origin_folder> <dest_folder>
"""

import os
import sys
import zlib
from os import listdir
from os.path import isfile, join


def main(argv):
    if len(argv) != 3:
        print("Usage: decompress_ch.py <origin_folder> <dest_folder>", file=sys.stderr)
        return 2

    origin_folder = argv[1]
    dest_folder = argv[2]

    if not os.path.isdir(origin_folder):
        print(f"Origin folder not found: {origin_folder}", file=sys.stderr)
        return 1

    os.makedirs(dest_folder, exist_ok=True)

    files = [f for f in listdir(origin_folder) if isfile(join(origin_folder, f))]
    errors = 0

    for name in files:
        print("Iniciando " + name)
        with open(join(origin_folder, name), "rb") as f:
            content = f.read()

        try:
            decompress = zlib.decompressobj(-zlib.MAX_WBITS)
            inflated = decompress.decompress(content[14:])
            inflated += decompress.flush()
            # bytes in, bytes out -> win-1252 preserved; drop trailing byte (TOTVS framing)
            with open(join(dest_folder, name), "wb") as out:
                out.write(inflated[:-1])
        except Exception as exc:
            errors += 1
            print(f"Erro no arquivo {name}: {exc}", file=sys.stderr)

        print("Finalizando " + name)

    print(f"[INFO] Descompressao concluida: {len(files) - errors}/{len(files)} arquivos em {dest_folder}")
    return 1 if errors and errors == len(files) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
