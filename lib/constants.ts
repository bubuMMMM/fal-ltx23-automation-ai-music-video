export const DEFAULT_CHARACTER_PROMPT = `Mexican guy, messy textured hair, red Converse Chuck 70 high tops, black skinny jeans with chain, vintage red Members Only jacket, round sunglasses, toothpick in mouth, cool lean pose.`

export const DEFAULT_CHARACTER_STYLE = `CLAYMATION STOP MOTION STYLE, visible clay texture, fingerprint marks, Aardman Laika quality, handmade miniature world`

export const SCENES: string[] = [
  "Close-up, waking up inside a giant sneaker like a bed, stretching arms, clay morning light streaming in",
  "Wide shot, stepping out of sneaker-house into a bizarre miniature clay neighborhood, tiny clay houses",
  "Medium shot, brushing teeth at a sink made of stacked records, clay toothpaste foam",
  "Close-up face, looking in mirror (which is a shiny hubcap), fixing messy clay hair",
  "Wide shot, walking down a street paved with cassette tapes, clay boomboxes lining the path",
  "Medium shot, stopping to smell giant clay flowers that are actually colorful headphones",
  "Close-up, grabbing breakfast from a vending machine made of guitar pedals",
  "Wide shot, clay train station with turnstiles made of spinning vinyl records",
  "Medium shot, waiting for train, tapping foot impatiently, checking a watch made of clay pizza",
  "Close-up, clay train arriving, doors opening with a puff of glitter smoke",
  "Wide shot inside train, passengers are all clay creatures—dogs reading newspapers, cats on phones",
  "Medium shot, sitting on clay seat, bobbing head to imaginary music, window showing spinning city",
  "Close-up, winking at camera through window reflection, city zooming past",
  "Wide shot, stepping off train into a clay plaza with fountains shooting neon slime",
  "Medium shot, dancing briefly with a clay street performer who looks like a mix of robot and cowboy",
  "Close-up, tossing a coin into the fountain, coin splashes into confetti",
  "Wide shot, entering a clay cafe built inside a giant donut sculpture",
  "Medium shot, ordering coffee from a barista who is a friendly clay squid with multiple arms",
  "Close-up, sipping clay coffee that steams colorful rainbow vapor",
  "Wide shot, cafe erupts into spontaneous applause as character does a small spin move",
  "Medium shot, exiting cafe, puts on clay sunglasses dramatically",
  "Close-up, finger-gun gesture to camera, teeth sparkle",
  "Wide shot, hopping onto a clay skateboard made of stacked pancakes",
  "Medium shot, skating past clay fire hydrants that squirt neon water",
  "Close-up, face wind-blown, grinning wide, clay hair flapping",
  "Wide shot, skateboard jumps over a clay pit of friendly snapping turtles",
  "Medium shot, landing perfectly, arms raised triumphantly",
  "Close-up, high-fiving a tiny clay bird mid-air",
  "Wide shot, entering a clay music venue shaped like a giant jukebox",
  "Medium shot, walking through crowd of clay fans waving tiny flags",
  "Close-up, stepping up to a stage mic made of clay lollipops",
  "Wide shot, spotlight on, crowd cheering, clay confetti raining",
  "Medium shot, singing dramatically to camera, mouth exaggerated like classic animation",
  "Close-up, sweat drops made of glitter rolling down clay face",
  "Wide shot, jumping into crowd who gently carry the character",
  "Medium shot, surfing on clay hands, pointing to random crowd members",
  "Close-up, blowing a kiss to the camera, heart-shaped clay pops out",
  "Wide shot, crowd gently sets character back on stage",
  "Medium shot, taking a final bow, hat tips off revealing a tiny clay bird underneath",
  "Close-up, the bird chirps, then flies off leaving a trail of sparkle dust",
  "Wide shot, walking offstage through a curtain made of clay spaghetti strands",
  "Medium shot, backstage, high-fiving clay roadies who look like friendly monsters",
  "Close-up, collapsing dramatically onto a clay couch shaped like a hand",
  "Wide shot, someone hands the character a giant clay trophy shaped like a burrito",
  "Medium shot, hugging the burrito trophy, pretending to cry tears of joy",
  "Close-up, wiping eyes, then taking a big fake bite of the trophy",
  "Wide shot, leaving venue into a clay sunset street, golden light everywhere",
  "Medium shot, walking home, hands in pockets, whistling implied by mouth shape",
  "Close-up, stopping to look up at clay stars beginning to appear in the sky",
  "Wide shot, approaching the giant sneaker house again, door opens warmly",
  "Medium shot, stepping inside, waving goodbye to camera through window",
  "Close-up face, slowly closing eyes, clay world softly crumbling into colorful stardust"
]

export const STEP_LABELS: Record<number, string> = {
  1: 'Generate Character',
  2: 'Build Segments',
  3: 'Generate Frames',
  4: 'Select Frames',
  5: 'Generate Videos',
  6: 'Select Videos',
  7: 'Assemble',
  8: 'Done'
}

export const VIDEO_EFFECTS = [
  'zoom_in',
  'zoom_out',
  'zoom_in_fast',
  'center_zoom_in',
  'center_zoom_out',
  'center_zoom_punch',
  'shake'
] as const

export type VideoEffect = typeof VIDEO_EFFECTS[number]
