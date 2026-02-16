'use client'

import QRCode from 'react-qr-code'

interface QRCodeWithLogoProps {
    value: string
    size?: number
    fgColor?: string
    bgColor?: string
    style?: React.CSSProperties
    viewBox?: string
}

export default function QRCodeWithLogo({
    value,
    size = 256,
    fgColor = '#000000',
    bgColor = '#FFFFFF',
    style,
    viewBox,
}: QRCodeWithLogoProps) {
    // Logo takes ~22% of QR code size — safe with level H (30% error correction)
    const logoSize = Math.round(size * 0.22)
    const logoPadding = Math.round(logoSize * 0.15)
    const totalLogoArea = logoSize + logoPadding * 2

    return (
        <div style={{ position: 'relative', display: 'inline-block', width: style?.width, maxWidth: style?.maxWidth }}>
            <QRCode
                value={value}
                size={size}
                fgColor={fgColor}
                bgColor={bgColor}
                level="H"
                style={style}
                viewBox={viewBox}
            />
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: totalLogoArea,
                    height: totalLogoArea,
                    backgroundColor: bgColor,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/logos/28e3dff9-d0d8-4239-bdd4-810b36b7023a_1769596124427.png"
                    alt="Traaaction"
                    width={logoSize}
                    height={logoSize}
                    style={{ borderRadius: '50%' }}
                />
            </div>
        </div>
    )
}
