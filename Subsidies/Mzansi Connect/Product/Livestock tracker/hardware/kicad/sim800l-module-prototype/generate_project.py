from pathlib import Path
import csv
import json
import subprocess
import uuid

HERE = Path(__file__).resolve().parent
ROOT = next((p for p in HERE.parents if (p / 'Skyline-IT' / '.git').exists() and (p / 'Subsidies' / 'Mzansi Connect').exists()), None)
WORKING_PATH = None if ROOT is None else ROOT / 'Subsidies/Mzansi Connect/Product/Livestock tracker/hardware/kicad/sim800l-module-prototype'
MIRRORS = [] if HERE != WORKING_PATH else [ROOT / 'Skyline-IT' / HERE.relative_to(ROOT), ROOT / 'Subsidies/Mzansi Connect/Mzansi-Connect/Product/Livestock tracker/hardware/kicad/sim800l-module-prototype']
NAME = 'mzansi-sim800l-prototype'
SID = str(uuid.uuid5(uuid.NAMESPACE_URL, NAME))
parts = []
libs = []
items = []

def uid(key):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, NAME + '/' + key))

def q(value):
    return json.dumps(str(value))

def write(name, value):
    (HERE / name).write_text(value, encoding='utf-8')
    for target in MIRRORS:
        target.mkdir(parents=True, exist_ok=True)
        (target / name).write_text(value, encoding='utf-8')

def symbol(ref, value, pins, nets, x, y, footprint='', datasheet=''):
    x = round(round(x / 1.27) * 1.27, 4)
    y = round(round(y / 1.27) * 1.27, 4)
    key = 'S_' + ref
    n = len(pins)
    top = (n - 1) * 1.27
    height = max(3.81, top + 2.54)
    props = []
    for field, val, py in [('Reference', ref, height + 2.54), ('Value', value, -height - 2.54), ('Footprint', footprint, 0), ('Datasheet', datasheet, 0)]:
        hide = ' hide' if field in ['Footprint', 'Datasheet'] else ''
        props.append(f'(property {q(field)} {q(val)} (at 0 {py} 0) (effects (font (size 1.27 1.27)){hide}))')
    pin_defs = []
    for i, (num, label, kind) in enumerate(pins):
        py = round(top - i * 2.54, 4)
        pin_defs.append(f'(pin {kind} line (at -15.24 {py} 0) (length 5.08) (name {q(label)} (effects (font (size 1.1 1.1)))) (number {q(num)} (effects (font (size 1.1 1.1)))))')
    libs.append(f'(symbol "MzansiPrototype:{key}" (pin_names (offset 0.5)) (in_bom yes) (on_board yes) {" ".join(props)} (symbol "{key}_0_1" (rectangle (start -10.16 {height}) (end 15.24 {-height}) (stroke (width 0.254) (type default)) (fill (type background)))) (symbol "{key}_1_1" {" ".join(pin_defs)}))')
    iprops = []
    for field, val, py in [('Reference', ref, y - height - 2.54), ('Value', value, y + height + 2.54), ('Footprint', footprint, y), ('Datasheet', datasheet, y)]:
        hide = ' hide' if field in ['Footprint', 'Datasheet'] else ''
        iprops.append(f'(property {q(field)} {q(val)} (at {x} {py} 0) (effects (font (size 1.27 1.27)){hide}))')
    pin_instances = ' '.join(f'(pin {q(p[0])} (uuid {uid(ref + "/pin/" + str(p[0]))}))' for p in pins)
    items.append(f'(symbol (lib_id "MzansiPrototype:{key}") (at {x} {y} 0) (unit 1) (in_bom yes) (on_board yes) (dnp no) (uuid {uid(ref)}) {" ".join(iprops)} {pin_instances} (instances (project "{NAME}" (path "/{SID}" (reference "{ref}") (unit 1)))))')
    for i, (pin, net) in enumerate(zip(pins, nets)):
        px = round(x - 15.24, 4)
        py = round(y - top + i * 2.54, 4)
        if net is None:
            items.append(f'(no_connect (at {px} {py}) (uuid {uid(ref + "/nc/" + str(pin[0]))}))')
        else:
            lx = round(px - 10.16, 4)
            items.append(f'(wire (pts (xy {lx} {py}) (xy {px} {py})) (stroke (width 0) (type default)) (uuid {uid(ref + "/wire/" + str(pin[0]))}))')
            items.append(f'(label {q(net)} (at {lx} {py} 0) (effects (font (size 1.1 1.1)) (justify left bottom)) (uuid {uid(ref + "/label/" + str(pin[0]))}))')
    parts.append({'ref': ref, 'value': value, 'pins': dict((str(p[0]), net) for p, net in zip(pins, nets)), 'footprint': footprint, 'datasheet': datasheet})

def conn(ref, name, labels, nets, x, y, kinds=None):
    pins = [(str(i + 1), label, kinds[i] if kinds else 'passive') for i, label in enumerate(labels)]
    footprint = 'Connector_PinHeader_2.54mm:PinHeader_1x%02d_P2.54mm_Vertical' % len(labels)
    if ref in ['J1', 'J2', 'J3', 'J4', 'J5']:
        footprint = 'TerminalBlock_Phoenix:TerminalBlock_Phoenix_MKDS-1,5-%d-5.08_1x%02d_P5.08mm_Horizontal' % (len(labels), len(labels))
    symbol(ref, name, pins, nets, x, y, footprint)

def passive(ref, value, nets, x, y, fp):
    symbol(ref, value, [('1', '1', 'passive'), ('2', '2', 'passive')], nets, x, y, fp)

conn('J1', 'PROTECTED_1S_PACK', ['PACK+', 'PACK-'], ['PACK_POS', 'GND'], 45, 50, ['power_out', 'power_out'])
conn('J2', 'TP4056_USB-C_BOARD', ['BAT+', 'BAT-'], ['CHARGE_POS', 'GND'], 120, 50)
conn('J3', 'S13V25F3_3V3_MODULE', ['VIN', 'GND', 'VOUT'], ['RUN_BAT', 'GND', '+3V3'], 200, 50, ['passive', 'passive', 'power_out'])
conn('J4', 'S18V20ALV_SET_4V0', ['VIN', 'GND', 'VOUT'], ['RUN_BAT', 'GND', 'MODEM_4V0'], 280, 50, ['passive', 'passive', 'power_out'])
conn('J5', 'CHARGE_OFF_RUN_SWITCH', ['COMMON', 'CHARGE', 'RUN'], ['PACK_POS', 'CHARGE_POS', 'RUN_BAT'], 365, 50)
conn('J6', 'SIM800L_4_PIN', ['VBAT_4V0', 'GND', 'RXD_2V8', 'TXD_2V8'], ['MODEM_4V0', 'GND', 'SIM_RX_2V8', 'SIM_TX_2V8'], 45, 115, ['power_in', 'passive', 'input', 'output'])
symbol('U1', 'TXU0202DCUR', [('1', 'B2', 'input'), ('2', 'GND', 'power_in'), ('3', 'VCCA', 'power_in'), ('4', 'A2Y', 'output'), ('5', 'A1', 'input'), ('6', 'OE', 'input'), ('7', 'VCCB', 'power_in'), ('8', 'B1Y', 'output')], ['SIM_TX_2V8', 'GND', '+3V3', 'MCU_SIM_RX', 'MCU_SIM_TX', 'UART_OE', '+2V8', 'SIM_RX_2V8'], 125, 115, 'Package_SO:VSSOP-8_2.3x2mm_P0.5mm', 'https://www.ti.com/lit/ds/symlink/txu0202.pdf')
symbol('U2', 'TLV75528PDBVR', [('1', 'IN', 'power_in'), ('2', 'GND', 'power_in'), ('3', 'EN', 'input'), ('4', 'NC', 'no_connect'), ('5', 'OUT', 'power_out')], ['+3V3', 'GND', '+3V3', None, '+2V8'], 205, 115, 'Package_TO_SOT_SMD:SOT-23-5', 'https://www.ti.com/lit/ds/symlink/tlv755p.pdf')
conn('J7', 'DEVKITM1_J1_15PIN', ['GND', '3V3', '3V3', 'IO2_BOOT', 'IO3_SOS', 'GND', 'RST', 'GND', 'IO0_ADC', 'IO1_UART_OE', 'IO10_LED', 'GND', '5V_NC', '5V_NC', 'GND'], ['GND', '+3V3', '+3V3', None, 'SOS_N', 'GND', None, 'GND', 'BAT_ADC', 'UART_OE', 'LED_DRIVE', 'GND', None, None, 'GND'], 285, 115)
conn('J11', 'DEVKITM1_J3_15PIN', ['GND', 'TX21_BRIDGE_NC', 'RX20_BRIDGE_NC', 'GND', 'IO9_BOOT_NC', 'IO8_RGB_NC', 'GND', 'IO7_SIM_TX', 'IO6_SIM_RX', 'IO5_GPS_TX', 'IO4_GPS_RX', 'GND', 'IO18_USB_NC', 'IO19_USB_NC', 'GND'], ['GND', None, None, 'GND', None, None, 'GND', 'MCU_SIM_TX', 'MCU_SIM_RX', 'GPS_RX_3V3', 'GPS_TX_3V3', 'GND', None, None, 'GND'], 370, 115)
conn('J8', 'NEO6_4_PIN_3V3_UART', ['3V3', 'GND', 'TXD', 'RXD'], ['+3V3', 'GND', 'GPS_TX_3V3', 'GPS_RX_3V3'], 370, 180, ['power_in', 'passive', 'output', 'input'])
rfp = 'Resistor_SMD:R_0603_1608Metric'
cfp = 'Capacitor_SMD:C_0603_1608Metric'
passive('R1', '200k_1%', ['RUN_BAT', 'BAT_ADC'], 45, 180, rfp)
passive('R2', '100k_1%', ['BAT_ADC', 'GND'], 110, 180, rfp)
passive('C1', '100nF_10V', ['BAT_ADC', 'GND'], 175, 180, cfp)
passive('R3', '10k', ['+3V3', 'SOS_N'], 240, 180, rfp)
conn('J9', 'SOS_NO_BUTTON', ['SOS', 'GND'], ['SOS_N', 'GND'], 305, 180)
symbol('C2', '100uF_LOW_ESR_10V', [('1', '+', 'passive'), ('2', '-', 'passive')], ['MODEM_4V0', 'GND'], 45, 235, 'Capacitor_SMD:CP_Elec_6.3x5.8')
passive('C3', '1uF_10V', ['MODEM_4V0', 'GND'], 110, 235, cfp)
passive('C4', '1uF_10V', ['+3V3', 'GND'], 175, 235, cfp)
passive('C5', '1uF_10V', ['+2V8', 'GND'], 240, 235, cfp)
passive('C6', '100nF_10V', ['+3V3', 'GND'], 305, 235, cfp)
passive('C7', '100nF_10V', ['+2V8', 'GND'], 370, 235, cfp)
passive('R4', '1k', ['LED_DRIVE', 'LED_ANODE'], 45, 275, rfp)
symbol('D1', 'PURPLE_LED', [('1', 'K', 'passive'), ('2', 'A', 'passive')], ['GND', 'LED_ANODE'], 110, 275, 'LED_SMD:LED_0603_1608Metric')
passive('R5', '100k_OE_DEFAULT_OFF', ['UART_OE', 'GND'], 185, 275, rfp)
notes = ['PIN-LEVEL MODULE CARRIER REVIEW - NOT FOR FABRICATION', 'J6 SIM800L and J8 GPS have exactly 4 pins. SIM800L must have onboard/manual PWRKEY; no remote PWRKEY wire.', 'J5 external SPDT centre-off break-before-make switch: battery common, CHARGE or RUN. Device OFF while charging.', 'J3/J4 are external regulator modules. Preset J4 to 4.0V BEFORE connecting SIM800L. Verify 2A bursts and 3.4-4.4V at modem.', 'TP4056 USB-C board must charge an independently protected 1S pack through its protected terminals; verify RPROG and USB-C CC resistors.', 'J7/J11 exactly map official DevKitM-1 J1/J3. GPIO20/21 bridge, GPIO18/19 USB and GPIO2/8/9 straps unused. No simultaneous USB/3V3 power.', 'Named wire interfaces, not guessed module footprint spacing. GPS board must support true 3.3V power/UART; verify its regulator.']
for i, note in enumerate(notes):
    items.append(f'(text {q(note)} (at 15 {15 + i * 3.5} 0) (effects (font (size {1.6 if i == 0 else 1.1} {1.6 if i == 0 else 1.1})) (justify left)) (uuid {uid("note" + str(i))}))')
schematic = f'(kicad_sch (version 20230121) (generator skyline_prototype) (uuid {SID}) (paper "A3") (title_block (title "Mzansi Connect - SIM800L module prototype") (date "2026-10-24") (rev "REVIEW-1") (company "Mzansi Connect")) (lib_symbols {" ".join(libs)}) {" ".join(items)} (sheet_instances (path "/" (page "1"))))\n'
write(NAME + '.kicad_sch', schematic)
classes = []
for name, width in [('Default', 0.25), ('Battery', 2.0), ('Modem', 1.5), ('Charge', 1.0)]:
    classes.append({'name': name, 'clearance': 0.15, 'track_width': width, 'via_diameter': 0.8, 'via_drill': 0.4, 'microvia_diameter': 0.3, 'microvia_drill': 0.1, 'diff_pair_width': 0.2, 'diff_pair_gap': 0.25, 'diff_pair_via_gap': 0.25, 'wire_width': 6, 'bus_width': 12, 'line_style': 0, 'pcb_color': 'rgba(0, 0, 0, 0.000)', 'schematic_color': 'rgba(0, 0, 0, 0.000)'})
for i, item in enumerate(classes):
    item['priority'] = 2147483647 if item['name'] == 'Default' else i
    item['tuning_profile'] = ''
settings = {'classes': classes, 'meta': {'version': 5}, 'netclass_assignments': None, 'net_colors': None, 'netclass_patterns': [{'netclass': 'Battery', 'pattern': '/PACK_POS'}, {'netclass': 'Battery', 'pattern': '/RUN_BAT'}, {'netclass': 'Modem', 'pattern': '/MODEM_4V0'}, {'netclass': 'Charge', 'pattern': '/CHARGE_POS'}]}
write(NAME + '.kicad_pro', json.dumps({'meta': {'filename': NAME + '.kicad_pro', 'version': 1}, 'board': {'design_settings': {'rules': {'min_clearance': 0.15, 'min_track_width': 0.2, 'min_via_diameter': 0.8, 'min_through_hole_diameter': 0.4}}}, 'schematic': {}, 'net_settings': settings, 'text_variables': {'STATUS': 'REVIEW ONLY - NOT FOR FABRICATION'}}, indent=2) + '\n')
write('pin-map.json', json.dumps(parts, indent=2) + '\n')
write('sym-lib-table', '(sym_lib_table (version 7) (lib (name "MzansiPrototype") (type "KiCad") (uri "${KIPRJMOD}/MzansiPrototype.kicad_sym") (options "") (descr "Project-specific named harness contracts and verified IC pin functions")))\n')
write('MzansiPrototype.kicad_sym', '(kicad_symbol_lib (version 20220914) (generator skyline_prototype) ' + ' '.join(s.replace('"MzansiPrototype:S_', '"S_', 1) for s in libs) + ')\n')
with (HERE / 'bom.csv').open('w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['Reference', 'Value_or_interface', 'Footprint', 'Datasheet'])
    w.writerows((p['ref'], p['value'], p['footprint'], p['datasheet']) for p in parts)
write('bom.csv', (HERE / 'bom.csv').read_text(encoding='utf-8'))
print(f'Generated {len(parts)} electrically connected symbols. Module dimensions remain unspecified.')
