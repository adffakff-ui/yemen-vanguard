#!/usr/bin/env python3
import struct
import zlib
import hashlib
import zipfile
import subprocess
import os
import shutil

def build_axml():
    # Canonical string pool for AndroidManifest.xml
    strings = [
        "http://schemas.android.com/apk/res/android", # 0
        "manifest",                                   # 1
        "package",                                    # 2
        "versionCode",                                # 3
        "versionName",                                # 4
        "com.yemenvanguard.tacticalcommando",         # 5
        "1.4.0",                                      # 6
        "uses-sdk",                                   # 7
        "minSdkVersion",                              # 8
        "targetSdkVersion",                           # 9
        "application",                                # 10
        "label",                                      # 11
        "hasCode",                                    # 12
        "hardwareAccelerated",                        # 13
        "Yemen Vanguard",                             # 14
        "activity",                                   # 15
        "name",                                       # 16
        "exported",                                   # 17
        "android.app.NativeActivity",                 # 18
        "intent-filter",                              # 19
        "action",                                     # 20
        "android.intent.action.MAIN",                 # 21
        "category",                                   # 22
        "android.intent.category.LAUNCHER",           # 23
        "android",                                    # 24
        "screenOrientation",                          # 25
        "sensorLandscape"                             # 26
    ]

    # Map string index to Android resource ID if it's an android attribute
    # android:label = 0x01010001
    # android:name  = 0x01010003
    # android:hasCode = 0x0101000c
    # android:exported = 0x01010010
    # android:screenOrientation = 0x0101001e
    # android:minSdkVersion = 0x0101020c
    # android:versionCode = 0x0101021b
    # android:versionName = 0x0101021c
    # android:targetSdkVersion = 0x01010270
    # android:hardwareAccelerated = 0x010102d3
    res_map = {
        3:  0x0101021b, # versionCode
        4:  0x0101021c, # versionName
        8:  0x0101020c, # minSdkVersion
        9:  0x01010270, # targetSdkVersion
        11: 0x01010001, # label
        12: 0x0101000c, # hasCode
        13: 0x010102d3, # hardwareAccelerated
        16: 0x01010003, # name
        17: 0x01010010, # exported
        25: 0x0101001e  # screenOrientation
    }

    # 1. Build String Pool
    str_data = bytearray()
    offsets = []
    for s in strings:
        offsets.append(len(str_data))
        encoded = s.encode('utf-16le')
        str_data += struct.pack('<H', len(s)) + encoded + b'\x00\x00'
    while len(str_data) % 4 != 0:
        str_data += b'\x00'

    sp_header_size = 28
    sp_offsets_size = len(strings) * 4
    sp_strings_start = sp_header_size + sp_offsets_size
    sp_chunk_size = sp_strings_start + len(str_data)

    string_pool_chunk = bytearray()
    string_pool_chunk += struct.pack('<HH', 0x0001, sp_header_size)
    string_pool_chunk += struct.pack('<IIIIII', sp_chunk_size, len(strings), 0, 0, sp_strings_start, 0)
    for off in offsets:
        string_pool_chunk += struct.pack('<I', off)
    string_pool_chunk += str_data

    # 2. Build Resource Map Chunk
    # Contains a resource ID for each string up to the max index or mapping
    res_map_data = bytearray()
    for i in range(len(strings)):
        res_map_data += struct.pack('<I', res_map.get(i, 0))
    res_map_chunk_size = 8 + len(res_map_data)
    res_map_chunk = struct.pack('<HHI', 0x0180, 8, res_map_chunk_size) + res_map_data

    # Helper for chunks
    xml_chunks = bytearray()

    # Namespace Start: xmlns:android="http://schemas.android.com/apk/res/android"
    # type=0x0100, header_size=16, size=24, line=1, comment=-1, prefix=24("android"), uri=0
    xml_chunks += struct.pack('<HHI II II', 0x0100, 16, 24, 1, 0xFFFFFFFF, 24, 0)

    # Element Start: <manifest package="com.yemenvanguard.tacticalcommando" android:versionCode="140" android:versionName="1.4.0">
    # Attrs:
    # 1) package="com.yemenvanguard.tacticalcommando" (no ns, name=2, raw=5, type=0x03, data=5)
    # 2) android:versionCode=140 (ns=0, name=3, raw=-1, type=0x10, data=140)
    # 3) android:versionName="1.4.0" (ns=0, name=4, raw=6, type=0x03, data=6)
    manifest_attrs = bytearray()
    # attr 1: package
    manifest_attrs += struct.pack('<III HBB I', 0xFFFFFFFF, 2, 5, 8, 0, 0x03, 5)
    # attr 2: android:versionCode
    manifest_attrs += struct.pack('<III HBB I', 0, 3, 0xFFFFFFFF, 8, 0, 0x10, 140)
    # attr 3: android:versionName
    manifest_attrs += struct.pack('<III HBB I', 0, 4, 6, 8, 0, 0x03, 6)
    manifest_start_size = 16 + 20 + len(manifest_attrs)
    xml_chunks += struct.pack('<HHI II II HHH HHH',
        0x0102, 16, manifest_start_size,
        1, 0xFFFFFFFF,
        0xFFFFFFFF, 1, # ns, name("manifest")
        0x0014, 0x0014, 3, # attr_start, attr_size, count=3
        0, 0, 0
    ) + manifest_attrs

    # Element Start: <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="28"/>
    # Attrs:
    # 1) android:minSdkVersion=21 (ns=0, name=8, raw=-1, type=0x10, data=21)
    # 2) android:targetSdkVersion=28 (ns=0, name=9, raw=-1, type=0x10, data=28)
    sdk_attrs = bytearray()
    sdk_attrs += struct.pack('<III HBB I', 0, 8, 0xFFFFFFFF, 8, 0, 0x10, 21)
    sdk_attrs += struct.pack('<III HBB I', 0, 9, 0xFFFFFFFF, 8, 0, 0x10, 28)
    sdk_start_size = 16 + 20 + len(sdk_attrs)
    xml_chunks += struct.pack('<HHI II II HHH HHH',
        0x0102, 16, sdk_start_size,
        2, 0xFFFFFFFF,
        0xFFFFFFFF, 7, # ns, name("uses-sdk")
        0x0014, 0x0014, 2,
        0, 0, 0
    ) + sdk_attrs

    # Element End: </uses-sdk>
    xml_chunks += struct.pack('<HHI II II', 0x0103, 16, 24, 2, 0xFFFFFFFF, 0xFFFFFFFF, 7)

    # Element Start: <application android:label="Yemen Vanguard" android:hasCode="false" android:hardwareAccelerated="true">
    app_attrs = bytearray()
    app_attrs += struct.pack('<III HBB I', 0, 11, 14, 8, 0, 0x03, 14)       # android:label="Yemen Vanguard"
    app_attrs += struct.pack('<III HBB I', 0, 12, 0xFFFFFFFF, 8, 0, 0x12, 0) # android:hasCode=false (0)
    app_attrs += struct.pack('<III HBB I', 0, 13, 0xFFFFFFFF, 8, 0, 0x12, 0xFFFFFFFF) # android:hardwareAccelerated=true (0xFFFFFFFF)
    app_start_size = 16 + 20 + len(app_attrs)
    xml_chunks += struct.pack('<HHI II II HHH HHH',
        0x0102, 16, app_start_size,
        3, 0xFFFFFFFF,
        0xFFFFFFFF, 10, # ns, name("application")
        0x0014, 0x0014, 3,
        0, 0, 0
    ) + app_attrs

    # Element Start: <activity android:name="android.app.NativeActivity" android:exported="true" android:screenOrientation="sensorLandscape">
    act_attrs = bytearray()
    act_attrs += struct.pack('<III HBB I', 0, 16, 18, 8, 0, 0x03, 18) # android:name="android.app.NativeActivity"
    act_attrs += struct.pack('<III HBB I', 0, 17, 0xFFFFFFFF, 8, 0, 0x12, 0xFFFFFFFF) # android:exported=true
    act_attrs += struct.pack('<III HBB I', 0, 25, 26, 8, 0, 0x03, 26) # android:screenOrientation="sensorLandscape"
    act_start_size = 16 + 20 + len(act_attrs)
    xml_chunks += struct.pack('<HHI II II HHH HHH',
        0x0102, 16, act_start_size,
        4, 0xFFFFFFFF,
        0xFFFFFFFF, 15, # ns, name("activity")
        0x0014, 0x0014, 3,
        0, 0, 0
    ) + act_attrs

    # Element Start: <intent-filter>
    xml_chunks += struct.pack('<HHI II II HHH HHH',
        0x0102, 16, 36,
        5, 0xFFFFFFFF,
        0xFFFFFFFF, 19,
        0x0014, 0x0014, 0,
        0, 0, 0
    )

    # Element Start: <action android:name="android.intent.action.MAIN"/>
    action_attrs = struct.pack('<III HBB I', 0, 16, 21, 8, 0, 0x03, 21)
    xml_chunks += struct.pack('<HHI II II HHH HHH',
        0x0102, 16, 16 + 20 + 20,
        6, 0xFFFFFFFF,
        0xFFFFFFFF, 20,
        0x0014, 0x0014, 1,
        0, 0, 0
    ) + action_attrs
    # Element End: </action>
    xml_chunks += struct.pack('<HHI II II', 0x0103, 16, 24, 6, 0xFFFFFFFF, 0xFFFFFFFF, 20)

    # Element Start: <category android:name="android.intent.category.LAUNCHER"/>
    cat_attrs = struct.pack('<III HBB I', 0, 16, 23, 8, 0, 0x03, 23)
    xml_chunks += struct.pack('<HHI II II HHH HHH',
        0x0102, 16, 16 + 20 + 20,
        7, 0xFFFFFFFF,
        0xFFFFFFFF, 22,
        0x0014, 0x0014, 1,
        0, 0, 0
    ) + cat_attrs
    # Element End: </category>
    xml_chunks += struct.pack('<HHI II II', 0x0103, 16, 24, 7, 0xFFFFFFFF, 0xFFFFFFFF, 22)

    # Element End: </intent-filter>
    xml_chunks += struct.pack('<HHI II II', 0x0103, 16, 24, 5, 0xFFFFFFFF, 0xFFFFFFFF, 19)

    # Element End: </activity>
    xml_chunks += struct.pack('<HHI II II', 0x0103, 16, 24, 4, 0xFFFFFFFF, 0xFFFFFFFF, 15)

    # Element End: </application>
    xml_chunks += struct.pack('<HHI II II', 0x0103, 16, 24, 3, 0xFFFFFFFF, 0xFFFFFFFF, 10)

    # Element End: </manifest>
    xml_chunks += struct.pack('<HHI II II', 0x0103, 16, 24, 1, 0xFFFFFFFF, 0xFFFFFFFF, 1)

    # Namespace End: android
    xml_chunks += struct.pack('<HHI II II', 0x0101, 16, 24, 1, 0xFFFFFFFF, 24, 0)

    # Full AXML File Header
    total_file_size = 8 + len(string_pool_chunk) + len(res_map_chunk) + len(xml_chunks)
    axml_header = struct.pack('<HHI', 0x0003, 8, total_file_size)
    return axml_header + string_pool_chunk + res_map_chunk + xml_chunks

def build_resources_arsc():
    # Valid minimal resources table
    res_table = bytearray()
    res_table += struct.pack('<HHI', 0x0002, 12, 40)
    res_table += struct.pack('<I', 0) # package count = 0
    res_table += struct.pack('<HHIIIIII', 0x0001, 28, 28, 0, 0, 0, 28, 0)
    return res_table

def build_classes_dex():
    # Valid minimal 112-byte classes.dex
    dex = bytearray(112)
    dex[0:8] = b'dex\n035\0'
    dex[40:44] = struct.pack('<I', 0x12345678)
    dex[32:36] = struct.pack('<I', 112)
    dex[36:40] = struct.pack('<I', 112)
    dex[56:60] = struct.pack('<I', 112)
    sha = hashlib.sha1(dex[32:]).digest()
    dex[12:32] = sha
    adler = zlib.adler32(dex[12:])
    dex[8:12] = struct.pack('<I', adler)
    return dex

def sign_apk(unsigned_apk_path, signed_apk_path):
    temp_dir = "/tmp/apk_sign"
    shutil.rmtree(temp_dir, ignore_errors=True)
    os.makedirs(temp_dir, exist_ok=True)

    # Generate RSA key and certificate
    key_file = os.path.join(temp_dir, "key.pem")
    cert_file = os.path.join(temp_dir, "cert.pem")
    subprocess.run([
        "openssl", "req", "-x509", "-newkey", "rsa:2048",
        "-keyout", key_file, "-out", cert_file,
        "-days", "3650", "-nodes",
        "-subj", "/CN=YemenVanguardTacticalCommando/O=YemenVanguard/C=YE"
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Extract all files from unsigned apk and calculate SHA-256 digests
    with zipfile.ZipFile(unsigned_apk_path, 'r') as zin:
        files = zin.namelist()
        manifest_mf = bytearray(b"Manifest-Version: 1.0\r\nCreated-By: 1.0 (Android SignApk)\r\n\r\n")
        file_data_map = {}
        for f in files:
            data = zin.read(f)
            file_data_map[f] = data
            h = hashlib.sha256(data).digest()
            import base64
            b64_h = base64.b64encode(h).decode('ascii')
            manifest_mf += f"Name: {f}\r\nSHA-256-Digest: {b64_h}\r\n\r\n".encode('utf-8')

    manifest_file = os.path.join(temp_dir, "MANIFEST.MF")
    with open(manifest_file, "wb") as mf:
        mf.write(manifest_mf)

    # Create CERT.SF
    import base64
    manifest_hash = base64.b64encode(hashlib.sha256(manifest_mf).digest()).decode('ascii')
    cert_sf = bytearray(f"Signature-Version: 1.0\r\nCreated-By: 1.0 (Android SignApk)\r\nSHA-256-Digest-Manifest: {manifest_hash}\r\n\r\n".encode('utf-8'))
    
    # Per-file section in CERT.SF
    for f in files:
        # compute digest of the 2-line header in manifest
        name_line = f"Name: {f}\r\n"
        data = file_data_map[f]
        h = hashlib.sha256(data).digest()
        b64_h = base64.b64encode(h).decode('ascii')
        entry_bytes = f"{name_line}SHA-256-Digest: {b64_h}\r\n\r\n".encode('utf-8')
        entry_hash = base64.b64encode(hashlib.sha256(entry_bytes).digest()).decode('ascii')
        cert_sf += f"Name: {f}\r\nSHA-256-Digest: {entry_hash}\r\n\r\n".encode('utf-8')

    sf_file = os.path.join(temp_dir, "CERT.SF")
    with open(sf_file, "wb") as sf:
        sf.write(cert_sf)

    # Sign CERT.SF into CERT.RSA using openssl smime
    rsa_file = os.path.join(temp_dir, "CERT.RSA")
    subprocess.run([
        "openssl", "smime", "-sign", "-in", sf_file, "-out", rsa_file,
        "-outform", "DER", "-inkey", key_file, "-signer", cert_file
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    with open(rsa_file, "rb") as rf:
        cert_rsa = rf.read()

    # Rebuild final signed APK (zip)
    with zipfile.ZipFile(signed_apk_path, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        # Signature files must be first
        zout.writestr("META-INF/MANIFEST.MF", manifest_mf)
        zout.writestr("META-INF/CERT.SF", cert_sf)
        zout.writestr("META-INF/CERT.RSA", cert_rsa)
        for f in files:
            zout.writestr(f, file_data_map[f])

    shutil.rmtree(temp_dir, ignore_errors=True)
    print(f"[+] Signed APK created at: {signed_apk_path} ({os.path.getsize(signed_apk_path)} bytes)")

def main():
    print("[*] Generating Binary AndroidManifest.xml (AXML)...")
    axml = build_axml()
    print(f"[+] AXML generated: {len(axml)} bytes (magic: 0x{axml[:4].hex()})")

    arsc = build_resources_arsc()
    dex = build_classes_dex()

    temp_unsigned = "/tmp/app-unsigned.apk"
    with zipfile.ZipFile(temp_unsigned, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        # AndroidManifest.xml MUST be stored or deflated with AXML binary format
        z.writestr("AndroidManifest.xml", axml)
        z.writestr("resources.arsc", arsc)
        z.writestr("classes.dex", dex)

        # Include WebGL 3D launcher and assets
        index_html = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>طليعة اليمن: عملية صابر</title>
  <style>
    body, html { margin:0; padding:0; width:100%; height:100%; background:#0c0e12; color:#fff; font-family:sans-serif; overflow:hidden; }
    #root { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; padding:20px; }
    .btn { background:#f59e0b; color:#0c0e12; border:none; padding:14px 28px; border-radius:12px; font-weight:bold; font-size:16px; cursor:pointer; margin-top:20px; text-decoration:none; display:inline-block; }
  </style>
</head>
<body>
  <div id="root">
    <h1 style="color:#f59e0b; margin:0 0 10px 0;">طليعة اليمن: عملية صابر</h1>
    <p style="color:#94a3b8; max-width:400px; font-size:14px;">حزمة أندرويد المستقلة v1.4.0 - تشغيل كامل بملء الشاشة 60 إطاراً بالثانية.</p>
    <a href="https://yemen-vanguard.vercel.app" class="btn">تشغيل اللعبة الآن [PLAY GAME]</a>
  </div>
  <script>
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
      // In webview wrapper
      window.location.href = 'https://yemen-vanguard.vercel.app';
    }
  </script>
</body>
</html>"""
        z.writestr("assets/index.html", index_html)

        # Icon if available
        icon_path = "public/pwa-512x512.png"
        if os.path.exists(icon_path):
            with open(icon_path, "rb") as ic:
                z.writestr("res/drawable/icon.png", ic.read())

    # Sign the APK into public folder
    public_apk = "public/YemenVanguard-TacticalCommando-v1.4.0.apk"
    sign_apk(temp_unsigned, public_apk)

    # Also symlink / copy as default yemen-vanguard.apk
    shutil.copyfile(public_apk, "public/yemen-vanguard.apk")
    print("[+] APK files ready in /public directory for direct HTTP download.")

if __name__ == "__main__":
    main()
