package maps

type Metadata struct {
	PosX  float64 `json:"posX"`
	PosY  float64 `json:"posY"`
	Scale float64 `json:"scale"`
	Size  int     `json:"size"`
}

const RadarSize = 1024

var registry = map[string]Metadata{
	"de_overpass": {PosX: -4831, PosY: 1781, Scale: 5.2, Size: RadarSize},
	"de_dust2":    {PosX: -2476, PosY: 3239, Scale: 4.4, Size: RadarSize},
	"de_mirage":   {PosX: -3230, PosY: 1713, Scale: 5.0, Size: RadarSize},
	"de_inferno":  {PosX: -2087, PosY: 3870, Scale: 4.9, Size: RadarSize},
	"de_nuke":     {PosX: -3453, PosY: 2887, Scale: 7.0, Size: RadarSize},
	"de_ancient":  {PosX: -2953, PosY: 2164, Scale: 5.0, Size: RadarSize},
	"de_anubis":   {PosX: -2796, PosY: 3328, Scale: 5.22, Size: RadarSize},
	"de_vertigo":  {PosX: -3168, PosY: 1762, Scale: 4.0, Size: RadarSize},
	"de_train":    {PosX: -2477, PosY: 2392, Scale: 4.7, Size: RadarSize},
	"de_cache":    {PosX: -2000, PosY: 3250, Scale: 5.5, Size: RadarSize},
}

func Lookup(name string) (Metadata, bool) {
	meta, ok := registry[name]
	return meta, ok
}

func Normalize(name string, worldX, worldY float64) (float64, float64) {
	meta, ok := Lookup(name)
	if !ok || meta.Scale == 0 || meta.Size == 0 {
		return worldX, worldY
	}

	x := (worldX - meta.PosX) / meta.Scale / float64(meta.Size)
	y := (meta.PosY - worldY) / meta.Scale / float64(meta.Size)
	return x, y
}
