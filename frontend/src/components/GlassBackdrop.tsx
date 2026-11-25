export function GlassBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      style={{ contain: 'strict' }}
    >
      {/* Top-left subtle icy cyan sheen to illuminate sidebar Liquid Glass */}
      <div
        className="absolute -top-32 -left-24 w-[520px] h-[520px] opacity-65"
        style={{
          background:
            'radial-gradient(circle at 45% 45%, rgba(255,255,255,0.82) 0%, rgba(214,234,255,0.42) 38%, rgba(196,220,252,0) 74%)',
        }}
      />

      {/* Top-right smooth pre-feathered drifting glass blob (no runtime filter blur) */}
      <div
        className="glass-blob-a absolute -top-44 -right-36 w-[780px] h-[780px] opacity-80"
        style={{
          background:
            'radial-gradient(circle at 42% 42%, rgba(255,255,255,0.84) 0%, rgba(210,228,255,0.5) 32%, rgba(192,208,248,0.2) 58%, rgba(192,208,248,0) 76%)',
        }}
      />
      <svg
        viewBox="0 0 800 600"
        className="glass-swirl-a absolute -top-20 -right-24 w-[760px] h-[560px] opacity-46"
        fill="none"
      >
        <defs>
          <linearGradient id="swirlTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.88" />
            <stop offset="50%" stopColor="#D6E4FF" stopOpacity="0.44" />
            <stop offset="100%" stopColor="#C4D4F7" stopOpacity="0.06" />
          </linearGradient>
        </defs>
        <path
          d="M 180 40 C 340 -10, 580 70, 720 240 C 810 350, 740 520, 560 540 C 420 555, 360 410, 460 320 C 540 245, 670 290, 640 390"
          stroke="url(#swirlTop)"
          strokeWidth="44"
          strokeLinecap="round"
        />
        <path
          d="M 280 90 C 420 40, 610 120, 680 280"
          stroke="#FFFFFF"
          strokeOpacity="0.52"
          strokeWidth="12"
          strokeLinecap="round"
        />
      </svg>

      {/* Mid-canvas slow lavender-blue parallax refraction blob */}
      <div
        className="glass-blob-c absolute top-[20%] left-[24%] w-[660px] h-[620px] opacity-60"
        style={{
          background:
            'radial-gradient(circle at 48% 48%, rgba(238,234,255,0.68) 0%, rgba(206,224,255,0.38) 36%, rgba(186,204,244,0.14) 60%, rgba(186,204,244,0) 76%)',
        }}
      />

      {/* Bottom-left smooth pre-feathered drifting glass blob */}
      <div
        className="glass-blob-b absolute -bottom-52 -left-40 w-[760px] h-[760px] opacity-75"
        style={{
          background:
            'radial-gradient(circle at 56% 46%, rgba(255,255,255,0.8) 0%, rgba(204,220,250,0.48) 34%, rgba(182,202,246,0.18) 60%, rgba(182,202,246,0) 76%)',
        }}
      />
      <svg
        viewBox="0 0 700 600"
        className="glass-swirl-b absolute -bottom-24 -left-24 w-[660px] h-[540px] opacity-36"
        fill="none"
      >
        <defs>
          <linearGradient id="swirlBottom" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.78" />
            <stop offset="55%" stopColor="#DCE6FA" stopOpacity="0.36" />
            <stop offset="100%" stopColor="#B8CBF2" stopOpacity="0.06" />
          </linearGradient>
        </defs>
        <path
          d="M -20 320 C 120 220, 310 260, 380 410 C 430 520, 320 620, 170 570 C 60 530, 80 390, 210 380"
          stroke="url(#swirlBottom)"
          strokeWidth="48"
          strokeLinecap="round"
        />
        <path
          d="M 40 360 C 170 290, 290 330, 330 430"
          stroke="#FFFFFF"
          strokeOpacity="0.48"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
