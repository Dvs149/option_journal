import SwiftUI

public struct AppLogoView: View {
    public let size: CGFloat
    public let showShadow: Bool
    
    public init(size: CGFloat = 32, showShadow: Bool = false) {
        self.size = size
        self.showShadow = showShadow
    }
    
    public var body: some View {
        ZStack {
            // Orange Squircle Background (#FF5722)
            RoundedRectangle(cornerRadius: size * 0.22, style: .continuous)
                .fill(KiteTheme.brandOrange)
                .frame(width: size, height: size)
                .shadow(
                    color: showShadow ? Color.black.opacity(0.25) : Color.clear,
                    radius: size * 0.08,
                    x: 0,
                    y: size * 0.04
                )
            
            // White Pulse Waveform Path
            PulseWaveformShape()
                .stroke(
                    Color.white,
                    style: StrokeStyle(
                        lineWidth: max(1.5, size * 0.085),
                        lineCap: .round,
                        lineJoin: .round
                    )
                )
                .frame(width: size * 0.60, height: size * 0.60)
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Pulse Waveform Shape
public struct PulseWaveformShape: Shape {
    public init() {}
    
    public func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        let minX = rect.minX
        let minY = rect.minY
        let midY = rect.midY
        
        // Exact Lucide Activity / TradeJournal heartbeat waveform
        // Starts horizontal -> goes up to peak -> down to trough -> returns to baseline -> horizontal exit
        path.move(to: CGPoint(x: minX, y: midY))
        path.addLine(to: CGPoint(x: minX + w * 0.22, y: midY))
        path.addLine(to: CGPoint(x: minX + w * 0.44, y: minY + h * 0.05)) // High peak
        path.addLine(to: CGPoint(x: minX + w * 0.70, y: minY + h * 0.95)) // Deep trough
        path.addLine(to: CGPoint(x: minX + w * 0.88, y: midY))
        path.addLine(to: CGPoint(x: minX + w, y: midY))
        
        return path
    }
}

#Preview {
    VStack(spacing: 20) {
        AppLogoView(size: 24)
        AppLogoView(size: 32)
        AppLogoView(size: 48, showShadow: true)
        AppLogoView(size: 80, showShadow: true)
    }
    .padding(40)
    .background(KiteTheme.canvasDark)
}
