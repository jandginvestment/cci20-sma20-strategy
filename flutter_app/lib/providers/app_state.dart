import 'package:flutter/foundation.dart';
import '../models/watchlist.dart';
import '../models/scan_result.dart';
import '../models/signal.dart';
import '../services/data_service.dart';

enum TimeframeFilter { all, year, month, week }

class AppState extends ChangeNotifier {
  List<Watchlist> _watchlists = [];
  Watchlist? _activeWatchlist;
  List<ScanResult> _results = [];
  bool _loading = true;
  String _error = '';

  TimeframeFilter _activeFilter = TimeframeFilter.all;
  dynamic _activeSignalFilter = 'all'; // 'all' or SignalType

  String _sortColumn = 'pctFromYLow';
  bool _sortAscending = true;

  // Getters
  List<Watchlist> get watchlists => _watchlists;
  Watchlist? get activeWatchlist => _activeWatchlist;
  List<ScanResult> get results => _results;
  bool get loading => _loading;
  String get error => _error;
  TimeframeFilter get activeFilter => _activeFilter;
  dynamic get activeSignalFilter => _activeSignalFilter;
  String get sortColumn => _sortColumn;
  bool get sortAscending => _sortAscending;

  int get nearYLowCount => _results.where((r) => r.nearYLow).length;
  int get nearMLowCount => _results.where((r) => r.nearMLow).length;
  int get nearWLowCount => _results.where((r) => r.nearWLow).length;

  /// Load all watchlists and populate the first one
  Future<void> fetchWatchlists() async {
    _loading = true;
    _error = '';
    notifyListeners();

    try {
      _watchlists = await DataService.fetchWatchlists();
      if (_watchlists.isNotEmpty) {
        await loadWatchlist(_watchlists[0]);
      } else {
        _error = 'No watchlists found in watchlists.json';
        _loading = false;
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
      _loading = false;
      notifyListeners();
    }
  }

  /// Load data for a specific watchlist
  Future<void> loadWatchlist(Watchlist wl) async {
    _activeWatchlist = wl;
    _loading = true;
    _error = '';
    notifyListeners();

    try {
      _results = await DataService.loadWatchlistData(wl.file);
      _loading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _loading = false;
      notifyListeners();
    }
  }

  /// Set the active timeframe filter
  void setFilter(TimeframeFilter filter) {
    if (_activeFilter == filter) {
      _activeFilter = TimeframeFilter.all;
    } else {
      _activeFilter = filter;
    }
    notifyListeners();
  }

  /// Set the active signal filter
  void setSignalFilter(dynamic filter) {
    if (_activeSignalFilter == filter) {
      _activeSignalFilter = 'all';
    } else {
      _activeSignalFilter = filter;
    }
    notifyListeners();
  }

  /// Sort by a specific column
  void sortBy(String col) {
    if (_sortColumn == col) {
      _sortAscending = !_sortAscending;
    } else {
      _sortColumn = col;
      _sortAscending = true;
    }
    notifyListeners();
  }

  /// Get the list of results after applying timeframe and signal filters
  List<ScanResult> get filteredResults {
    List<ScanResult> current = List.from(_results);

    // Apply timeframe filter
    switch (_activeFilter) {
      case TimeframeFilter.year:
        current = current.where((r) => r.nearYLow).toList();
        break;
      case TimeframeFilter.month:
        current = current.where((r) => r.nearMLow).toList();
        break;
      case TimeframeFilter.week:
        current = current.where((r) => r.nearWLow).toList();
        break;
      case TimeframeFilter.all:
        break;
    }

    // Apply signal filter
    if (_activeSignalFilter != 'all') {
      final targetSignal = _activeSignalFilter as SignalType;
      current = current.where((r) => r.signal.type == targetSignal).toList();
    }

    return current;
  }

  /// Get the final list of results to be displayed, sorted and filtered
  List<ScanResult> get displayedResults {
    final data = filteredResults;
    if (_sortColumn.isEmpty) return data;

    final dir = _sortAscending ? 1 : -1;
    data.sort((a, b) {
      final av = _getProperty(a, _sortColumn);
      final bv = _getProperty(b, _sortColumn);

      if (av is String && bv is String) {
        return av.compareTo(bv) * dir;
      } else if (av is num && bv is num) {
        return av.compareTo(bv) * dir;
      }
      return 0;
    });

    return data;
  }

  /// Helper to get property value by string name for sorting
  dynamic _getProperty(ScanResult item, String prop) {
    switch (prop) {
      case 'ticker':
        return item.ticker;
      case 'close':
        return item.close;
      case 'cci20':
        return item.cci20;
      case 'sma20':
        return item.sma20;
      case 'yearlyLow':
        return item.yearlyLow;
      case 'monthlyLow':
        return item.monthlyLow;
      case 'weeklyLow':
        return item.weeklyLow;
      case 'pctFromYLow':
        return item.pctFromYLow;
      case 'pctFromMLow':
        return item.pctFromMLow;
      case 'pctFromWLow':
        return item.pctFromWLow;
      default:
        return 0;
    }
  }
}
