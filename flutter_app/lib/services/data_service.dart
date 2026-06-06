import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import 'package:csv/csv.dart';
import '../models/watchlist.dart';
import '../models/scan_result.dart';

class DataService {
  /// Fetch all watchlists from watchlists.json
  static Future<List<Watchlist>> fetchWatchlists() async {
    try {
      final jsonString = await rootBundle.loadString('assets/data/watchlists.json');
      final List<dynamic> jsonList = json.decode(jsonString);
      return jsonList.map((item) => Watchlist.fromJson(item as Map<String, dynamic>)).toList();
    } catch (e) {
      throw Exception('Failed to load watchlists.json: $e');
    }
  }

  /// Load a watchlist's CSV file and parse into a list of ScanResult
  static Future<List<ScanResult>> loadWatchlistData(String fileName) async {
    try {
      final csvString = await rootBundle.loadString('assets/data/$fileName');
      // Use csv package to convert csv string to List<List<dynamic>>
      // fieldDelimiter defaults to ','
      final List<List<dynamic>> csvTable = const CsvToListConverter(
        shouldParseNumbers: false, // parsing manually for safety
      ).convert(csvString);

      if (csvTable.length < 2) return [];

      final results = <ScanResult>[];
      // Skip header row at index 0
      for (int i = 1; i < csvTable.length; i++) {
        final row = csvTable[i].map((v) => v.toString()).toList();
        final scanResult = ScanResult.fromCsvRow(row);
        if (scanResult != null) {
          results.add(scanResult);
        }
      }
      return results;
    } catch (e) {
      throw Exception('Failed to load watchlist data ($fileName): $e');
    }
  }
}
