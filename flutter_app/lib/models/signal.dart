// models/signal.dart

enum SignalType { reversal, recovery, momentum, overbought, neutral }

class Signal {
  final SignalType type;
  final String label;
  final String title;

  const Signal({required this.type, required this.label, required this.title});

  /// Classify a stock row's CCI + SMA combination into a signal.
  static Signal classify({
    required double close,
    required double cci20,
    required double sma20,
  }) {
    final aboveSMA = close >= sma20;
    final belowSMA = close < sma20;
    final oversold = cci20 < -100;
    final recovering = cci20 >= -100 && cci20 < 0;
    final positive = cci20 >= 0 && cci20 <= 100;
    final overbought = cci20 > 100;

    if (oversold && belowSMA) {
      return const Signal(
        type: SignalType.reversal,
        label: 'Reversal Zone',
        title: 'CCI < -100 & Price below SMA20 — oversold + below MA',
      );
    }
    if (recovering && aboveSMA) {
      return const Signal(
        type: SignalType.recovery,
        label: 'Recovery',
        title: 'CCI -100→0 & Price > SMA20 — price holding above MA while CCI climbs back',
      );
    }
    if (positive && aboveSMA) {
      return const Signal(
        type: SignalType.momentum,
        label: 'Bullish Setup',
        title: 'CCI 0-100 & Price > SMA20 — positive momentum, price confirmed above MA',
      );
    }
    if (overbought && aboveSMA) {
      return const Signal(
        type: SignalType.overbought,
        label: 'Overbought',
        title: 'CCI > 100 & Price > SMA20 — strong trend but near take-profit zone',
      );
    }
    return const Signal(
      type: SignalType.neutral,
      label: 'No Signal',
      title: 'No clear CCI+SMA combination signal',
    );
  }
}
