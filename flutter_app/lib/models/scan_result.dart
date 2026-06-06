// models/scan_result.dart
import 'signal.dart';

class SparklineData {
  final List<SparklinePoint> points; // normalised 0..1 for both axes
  final double zeroY; // normalised Y for CCI=0 baseline

  const SparklineData({required this.points, required this.zeroY});
}

class SparklinePoint {
  final double dx;
  final double dy;
  const SparklinePoint(this.dx, this.dy);
}

class ScanResult {
  final String ticker;
  final double close;
  final double cci20;
  final double sma20;
  final double yearlyLow;
  final double monthlyLow;
  final double weeklyLow;
  final double pctFromYLow;
  final double pctFromMLow;
  final double pctFromWLow;
  final bool nearYLow;
  final bool nearMLow;
  final bool nearWLow;
  final List<double> cciHistory;

  late final Signal signal;
  late final SparklineData sparkline;

  ScanResult({
    required this.ticker,
    required this.close,
    required this.cci20,
    required this.sma20,
    required this.yearlyLow,
    required this.monthlyLow,
    required this.weeklyLow,
    required this.pctFromYLow,
    required this.pctFromMLow,
    required this.pctFromWLow,
    required this.nearYLow,
    required this.nearMLow,
    required this.nearWLow,
    required this.cciHistory,
  }) {
    signal = Signal.classify(close: close, cci20: cci20, sma20: sma20);
    sparkline = _buildSparkline(cciHistory);
  }

  static SparklineData _buildSparkline(List<double> values) {
    if (values.length < 2) {
      return const SparklineData(points: [], zeroY: 0.5);
    }
    final min = values.fold<double>(-150, (m, v) => v < m ? v : m);
    final max = values.fold<double>(150, (m, v) => v > m ? v : m);
    final range = (max - min) == 0 ? 1.0 : max - min;

    final points = <SparklinePoint>[];
    for (int i = 0; i < values.length; i++) {
      final x = i / (values.length - 1);
      final y = 1.0 - ((values[i] - min) / range); // flip: top=high
      points.add(SparklinePoint(x, y));
    }
    final zeroY = 1.0 - ((0 - min) / range);
    return SparklineData(points: points, zeroY: zeroY);
  }

  /// Parse one CSV row (index 1+) into a ScanResult.
  /// Expected column order matches scanner.py output:
  /// Ticker,Close,CCI_20,SMA_20,Yearly_Low,Monthly_Low,Weekly_Low,
  /// %_From_Y_Low,%_From_M_Low,%_From_W_Low,Near_Y_Low,Near_M_Low,Near_W_Low,CCI_History
  static ScanResult? fromCsvRow(List<String> row) {
    if (row.length < 13) return null;
    try {
      final historyStr = row.length > 13 ? row[13] : '';
      final history = historyStr
          .split('|')
          .map((v) => double.tryParse(v.trim()) ?? 0.0)
          .where((v) => v.isFinite)
          .toList();

      return ScanResult(
        ticker: row[0].trim(),
        close: double.parse(row[1]),
        cci20: double.parse(row[2]),
        sma20: double.parse(row[3]),
        yearlyLow: double.parse(row[4]),
        monthlyLow: double.parse(row[5]),
        weeklyLow: double.parse(row[6]),
        pctFromYLow: double.parse(row[7]),
        pctFromMLow: double.parse(row[8]),
        pctFromWLow: double.parse(row[9]),
        nearYLow: row[10].trim() == 'True',
        nearMLow: row[11].trim() == 'True',
        nearWLow: row[12].trim() == 'True',
        cciHistory: history,
      );
    } catch (_) {
      return null;
    }
  }
}
