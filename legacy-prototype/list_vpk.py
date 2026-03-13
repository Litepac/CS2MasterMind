import vpk
pak = vpk.open(r"C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive\game\csgo\maps\de_overpass.vpk")
files = list(pak)
# Print first 50 and anything with "radar" or "overview"
relevant = [f for f in files if "radar" in f.lower() or "overview" in f.lower() or "overpass" in f.lower()]
print("Relevante filer:")
for f in relevant[:30]:
    print(" ", f)
print(f"\nTotal filer: {len(files)}")
