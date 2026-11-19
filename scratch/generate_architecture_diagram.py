import os
from PIL import Image, ImageDraw, ImageFont

def render_architecture_diagram(output_path="report_code_snippets/architecture_workflow_diagram.png"):
    width = 1100
    height = 540
    bg_color = (255, 255, 255)
    
    img = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    try:
        title_font = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 20)
        subtitle_font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 13)
        stage_title_font = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 14)
        box_head_font = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 12)
        box_text_font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 11)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        stage_title_font = ImageFont.load_default()
        box_head_font = ImageFont.load_default()
        box_text_font = ImageFont.load_default()

    # Draw header banner
    draw.rectangle([(0, 0), (width, 64)], fill=(30, 58, 138)) # Navy blue #1E3A8A
    draw.text((36, 12), "PrintPod — Technical System Architecture & End-to-End Workflow", fill=(255, 255, 255), font=title_font)
    draw.text((36, 38), "Autonomous Cloud-to-Kiosk Handshake & Reactive WebSocket State Machine", fill=(219, 234, 254), font=subtitle_font)

    # 5 Stages
    stages = [
        {
            "step": "STAGE 1",
            "name": "User / Input",
            "color": (239, 246, 255),
            "border": (59, 130, 246),
            "accent": (30, 64, 175),
            "items": [
                ("Mobile Web Portal", "Student authenticates via responsive Next.js PWA."),
                ("Document & Order", "Uploads PDF/DOCX or picks campus stationery."),
                ("Configuration", "Selects copies, B&W/color, single/duplex paper.")
            ]
        },
        {
            "step": "STAGE 2",
            "name": "Processing",
            "color": (245, 243, 255),
            "border": (139, 92, 246),
            "accent": (109, 40, 217),
            "items": [
                ("Document Telemetry", "Client estimates pages & dynamic pricing tiers."),
                ("Order Aggregation", "Stationery cart subtotal & mock payment handshake."),
                ("Token Generation", "Creates rotating QR token + 5-digit numeric PIN.")
            ]
        },
        {
            "step": "STAGE 3",
            "name": "Technology Engine",
            "color": (236, 253, 245),
            "border": (16, 185, 129),
            "accent": (4, 120, 87),
            "items": [
                ("Supabase Realtime", "Sub-second WebSocket channels (orders_channel)."),
                ("Dual-Modal Kiosk", "High-contrast dynamic QR + 5-digit PIN keypad."),
                ("State Coordination", "Synchronizes POD_CONNECTED & PRINTING events.")
            ]
        },
        {
            "step": "STAGE 4",
            "name": "Hardware Output",
            "color": (254, 243, 199),
            "border": (245, 158, 11),
            "accent": (180, 83, 9),
            "items": [
                ("Laser Print Engine", "High-speed document printing and page collation."),
                ("Stationery Dispenser", "Physical release of pens, notebooks & files."),
                ("Digital Receipt", "Immediate collection feedback on mobile & kiosk.")
            ]
        },
        {
            "step": "STAGE 5",
            "name": "User / Beneficiary",
            "color": (240, 253, 250),
            "border": (20, 184, 166),
            "accent": (15, 118, 110),
            "items": [
                ("Campus Students", "Zero queue delays; collection in under 30 seconds."),
                ("Zero Infection Risk", "No malware-prone USB flash drives required."),
                ("Campus Operations", "Relieves manual rush & cuts paper misprint waste.")
            ]
        }
    ]

    card_width = 188
    card_height = 360
    start_x = 28
    gap_x = 24
    start_y = 90

    for i, s in enumerate(stages):
        x = start_x + i * (card_width + gap_x)
        y = start_y

        # Draw card container
        draw.rounded_rectangle([(x, y), (x + card_width, y + card_height)], radius=10, fill=s["color"], outline=s["border"], width=2)

        # Draw card header
        draw.rounded_rectangle([(x, y), (x + card_width, y + 54)], radius=10, fill=s["border"])
        draw.rectangle([(x, y + 44), (x + card_width, y + 54)], fill=s["border"])
        
        draw.text((x + 12, y + 8), s["step"], fill=(255, 255, 255), font=box_head_font)
        draw.text((x + 12, y + 26), s["name"], fill=(255, 255, 255), font=stage_title_font)

        # Draw items inside card
        item_y = y + 70
        for title, desc in s["items"]:
            draw.ellipse([(x + 12, item_y + 3), (x + 20, item_y + 11)], fill=s["accent"])
            draw.text((x + 26, item_y), title, fill=s["accent"], font=box_head_font)
            
            words = desc.split()
            line1, line2 = "", ""
            for w in words:
                if len(line1 + " " + w) < 24:
                    line1 = (line1 + " " + w).strip()
                else:
                    line2 = (line2 + " " + w).strip()
            
            draw.text((x + 26, item_y + 18), line1, fill=(51, 65, 85), font=box_text_font)
            if line2:
                draw.text((x + 26, item_y + 34), line2, fill=(51, 65, 85), font=box_text_font)
            
            item_y += 68

        # Draw geometric arrow to next card
        if i < len(stages) - 1:
            arrow_x = x + card_width + 4
            arrow_y = y + (card_height // 2)
            # draw arrow shaft
            draw.line([(arrow_x, arrow_y), (arrow_x + 10, arrow_y)], fill=(100, 116, 139), width=3)
            # draw arrowhead triangle
            draw.polygon([(arrow_x + 10, arrow_y - 6), (arrow_x + 17, arrow_y), (arrow_x + 10, arrow_y + 6)], fill=(100, 116, 139))

    # Footer note banner
    draw.rounded_rectangle([(28, height - 64), (width - 28, height - 16)], radius=6, fill=(248, 250, 252), outline=(203, 213, 225), width=1)
    footer_text = "Key Innovations: [1] Dual-Modal Optical QR + 5-Digit PIN Fallback Handshake  |  [2] Sub-Second Supabase WebSocket Realtime State Sync  |  [3] Unified Client Cart & Pricing Engine"
    draw.text((44, height - 48), footer_text, fill=(30, 41, 59), font=box_head_font)

    img.save(output_path, "PNG")
    print(f"Saved clean architecture workflow diagram to {output_path}")

if __name__ == "__main__":
    render_architecture_diagram()
