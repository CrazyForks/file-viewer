from pathlib import Path


def extension(path: str) -> str:
    return Path(path).suffix.removeprefix(".").lower()


for name in ["invoice.ofd", "drawing.dxf", "source.ts"]:
    print(name, extension(name))
