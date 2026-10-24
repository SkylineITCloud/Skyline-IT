from pathlib import Path
import json
import os
import uuid
import pcbnew

HERE = Path(__file__).resolve().parent
ROOT = next((p for p in HERE.parents if (p / 'Skyline-IT' / '.git').exists() and (p / 'Subsidies' / 'Mzansi Connect').exists()), None)
NAME = 'mzansi-sim800l-prototype'
SID = str(uuid.uuid5(uuid.NAMESPACE_URL, NAME))
library_candidates = [Path(os.environ[key]) for key in ['KICAD10_FOOTPRINT_DIR', 'KICAD9_FOOTPRINT_DIR'] if os.environ.get(key)]
library_candidates += [parent / 'share/kicad/footprints' for parent in Path(pcbnew.__file__).resolve().parents]
LIBS = next((p for p in library_candidates if p.is_dir()), None)
if LIBS is None:
    raise RuntimeError('Set KICAD10_FOOTPRINT_DIR to the official installed KiCad footprint library.')
parts = json.loads((HERE / 'pin-map.json').read_text(encoding='utf-8'))
board = pcbnew.BOARD()
board.SetCopperLayerCount(2)
board.GetDesignSettings().SetBoardThickness(pcbnew.FromMM(1.6))
nets = {}
for name in sorted({net for p in parts for net in p['pins'].values() if net is not None}):
    net = pcbnew.NETINFO_ITEM(board, '/' + name)
    board.Add(net)
    nets[name] = net
for index, part in enumerate(parts):
    library, fpname = part['footprint'].split(':')
    footprint = pcbnew.FootprintLoad(str(LIBS / (library + '.pretty')), fpname)
    if footprint is None:
        raise RuntimeError('Missing official stock footprint: ' + part['footprint'])
    footprint.SetFPID(pcbnew.LIB_ID(library, fpname))
    footprint.SetReference(part['ref'])
    footprint.SetValue(part['value'])
    footprint.SetPath(pcbnew.KIID_PATH('/' + SID + '/' + str(uuid.uuid5(uuid.NAMESPACE_URL, NAME + '/' + part['ref']))))
    positions = {'J1': (9, 10), 'J2': (25, 10), 'J3': (43, 10), 'J4': (63, 10), 'J5': (83, 10), 'J6': (94, 29), 'J7': (8, 28), 'J11': (25, 28), 'J8': (94, 48), 'U1': (73, 35), 'U2': (62, 35), 'R1': (43, 52), 'R2': (48, 52), 'C1': (53, 52), 'R3': (62, 52), 'J9': (72, 55), 'C2': (83, 28), 'C3': (87, 35), 'C4': (60, 31), 'C5': (62, 39), 'C6': (70, 31), 'C7': (76, 39), 'R4': (62, 62), 'D1': (68, 62)}
    positions['R5'] = (62, 45)
    x, y = positions[part['ref']]
    footprint.SetPosition(pcbnew.VECTOR2I(pcbnew.FromMM(x), pcbnew.FromMM(y)))
    board.Add(footprint)
    actual_pads = {p.GetNumber(): p for p in footprint.Pads()}
    for number, name in part['pins'].items():
        if number not in actual_pads:
            raise RuntimeError('Footprint lacks required pad ' + part['ref'] + ':' + number)
        if name is not None:
            actual_pads[number].SetNet(nets[name])
for start, end in [((0, 0), (100, 0)), ((100, 0), (100, 75)), ((100, 75), (0, 75)), ((0, 75), (0, 0))]:
    edge = pcbnew.PCB_SHAPE()
    edge.SetShape(pcbnew.SHAPE_T_SEGMENT)
    edge.SetStart(pcbnew.VECTOR2I(pcbnew.FromMM(start[0]), pcbnew.FromMM(start[1])))
    edge.SetEnd(pcbnew.VECTOR2I(pcbnew.FromMM(end[0]), pcbnew.FromMM(end[1])))
    edge.SetLayer(pcbnew.Edge_Cuts)
    edge.SetWidth(pcbnew.FromMM(0.05))
    board.Add(edge)
label = pcbnew.PCB_TEXT(board)
label.SetText('PROTOTYPE REVIEW - DO NOT FABRICATE\n100 x 75 mm bench carrier; external modules use named harnesses.')
label.SetPosition(pcbnew.VECTOR2I(pcbnew.FromMM(50), pcbnew.FromMM(71)))
label.SetTextSize(pcbnew.VECTOR2I(pcbnew.FromMM(1.2), pcbnew.FromMM(1.2)))
label.SetTextThickness(pcbnew.FromMM(0.2))
label.SetLayer(pcbnew.F_SilkS)
board.Add(label)
output = HERE / (NAME + '.kicad_pcb')
pcbnew.SaveBoard(str(output), board)
working_path = None if ROOT is None else ROOT / 'Subsidies/Mzansi Connect/Product/Livestock tracker/hardware/kicad/sim800l-module-prototype'
targets = [] if HERE != working_path else [ROOT / 'Skyline-IT' / HERE.relative_to(ROOT), ROOT / 'Subsidies/Mzansi Connect/Mzansi-Connect/Product/Livestock tracker/hardware/kicad/sim800l-module-prototype']
for target in targets:
    target.mkdir(parents=True, exist_ok=True)
    (target / output.name).write_bytes(output.read_bytes())
print('Placed', len(parts), 'official stock footprints with', len(nets), 'named nets. Zero tracks: routing is intentionally unfinished.')
