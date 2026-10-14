"""Download only the official NVIDIA backend missing from the reused portable CLI.

HTTP ranges avoid downloading the whole 1.47 GB Windows archive. Zipfile checks CRC.
Does not download any model or modify the previous project's installation.
"""
import io
import pathlib
import urllib.request
import zipfile
import sys
import binascii

URL = 'https://github.com/ollama/ollama/releases/download/v0.40.0/ollama-windows-amd64.zip'

class Remote(io.RawIOBase):
    def __init__(self):
        self.pos = 0
        self.cache = b''
        self.cache_start = 0
        with urllib.request.urlopen(urllib.request.Request(URL, headers={'Range': 'bytes=0-0'}), timeout=60) as r:
            if r.status != 206:
                raise RuntimeError('Range requests required to minimize downloads')
            self.url = r.geturl()
            self.size = int(r.headers['Content-Range'].split('/')[-1])
            r.read()
    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.pos
    def seek(self, offset, whence=0):
        self.pos = offset if whence == 0 else self.pos + offset if whence == 1 else self.size + offset
        return self.pos
    def read(self, size=-1):
        size = self.size-self.pos if size < 0 else min(size, self.size-self.pos)
        if size <= 0: return b''
        offset = self.pos - self.cache_start
        if offset < 0 or offset + size > len(self.cache):
            fetch_size = min(self.size-self.pos, max(size, 8 * 1024 * 1024))
            with urllib.request.urlopen(urllib.request.Request(self.url, headers={'Range': f'bytes={self.pos}-{self.pos+fetch_size-1}'}), timeout=120) as r:
                if r.status != 206: raise RuntimeError('Invalid range response')
                self.cache = r.read()
            if len(self.cache) != fetch_size: raise RuntimeError('Invalid range length')
            self.cache_start = self.pos
            offset = 0
        data = self.cache[offset:offset+size]
        self.pos += size
        return data

with zipfile.ZipFile(Remote()) as archive:
    entries = [i for i in archive.infolist() if '/cuda' in i.filename and not i.is_dir()]
    for i in entries: print(i.filename, i.file_size, i.compress_size, flush=True)
    if '--install' in sys.argv:
        target = pathlib.Path(__file__).resolve().parents[1] / '.local' / 'ollama'
        # CUDA 13 supported by measured driver 596.49 (CUDA 13.2); smaller download.
        entries = [i for i in entries if i.filename.startswith('lib/ollama/cuda_v13/')]
        if not entries: raise RuntimeError('No official CUDA 13 backend found')
        for i in entries:
            existing = target / i.filename
            if existing.exists() and existing.stat().st_size == i.file_size:
                crc = 0
                with existing.open('rb') as f:
                    while block := f.read(1024 * 1024): crc = binascii.crc32(block, crc)
                if crc & 0xffffffff == i.CRC:
                    print('Reusing verified', i.filename, flush=True)
                    continue
            print('Extracting', i.filename, flush=True)
            archive.extract(i, target)
        print('NVIDIA backend installed', flush=True)

