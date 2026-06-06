import 'package:flutter_test/flutter_test.dart';
import '../lib/models/signal.dart';
import '../lib/models/scan_result.dart';

void main() {
  group('Signal Classifier Tests', () {
    test('Oversold and below SMA should classify as Reversal Zone', () {
      final signal = Signal.classify(
        close: 95.0,
        cci20: -120.0,
        sma20: 100.0,
      );
      expect(signal.type, SignalType.reversal);
      expect(signal.label, 'Reversal Zone');
    });

    test('Recovering and above SMA should classify as Recovery', () {
      final signal = Signal.classify(
        close: 105.0,
        cci20: -50.0,
        sma20: 100.0,
      );
      expect(signal.type, SignalType.recovery);
      expect(signal.label, 'Recovery');
    });

    test('Positive and above SMA should classify as Bullish Setup', () {
      final signal = Signal.classify(
        close: 105.0,
        cci20: 50.0,
        sma20: 100.0,
      );
      expect(signal.type, SignalType.momentum);
      expect(signal.label, 'Bullish Setup');
    });

    test('Overbought and above SMA should classify as Overbought', () {
      final signal = Signal.classify(
        close: 115.0,
        cci20: 150.0,
        sma20: 100.0,
      );
      expect(signal.type, SignalType.overbought);
      expect(signal.label, 'Overbought');
    });

    test('Neutral conditions should classify as No Signal', () {
      final signal = Signal.classify(
        close: 95.0,
        cci20: 50.0,
        sma20: 100.0,
      );
      expect(signal.type, SignalType.neutral);
      expect(signal.label, 'No Signal');
    });
  });

  group('CSV Parsing and Sparkline Tests', () {
    test('Parse valid CSV row', () {
      final row = [
        'RELIANCE.NS',
        '1291.0',
        '-142.76',
        '1335.11',
        '1284.06',
        '1287.15',
        '1287.15',
        '0.54',
        '0.3',
        '0.3',
        'True',
        'True',
        'True',
        '19.2|-30.2|-52.6'
      ];

      final scanResult = ScanResult.fromCsvRow(row);
      expect(scanResult, isNotNull);
      expect(scanResult!.ticker, 'RELIANCE.NS');
      expect(scanResult.close, 1291.0);
      expect(scanResult.cci20, -142.76);
      expect(scanResult.nearYLow, isTrue);
      expect(scanResult.cciHistory, [19.2, -30.2, -52.6]);
      expect(scanResult.sparkline.points.length, 3);
    });

    test('Parse invalid CSV row should return null', () {
      final row = ['RELIANCE.NS', '1291.0']; // too short
      final scanResult = ScanResult.fromCsvRow(row);
      expect(scanResult, isNull);
    });
  });
}
