import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:intl/intl.dart';
import '../models/scan_result.dart';
import '../providers/app_state.dart';
import 'sparkline_widget.dart';
import 'signal_badge.dart';

class ScannerTable extends StatelessWidget {
  const ScannerTable({super.key});

  // Open TradingView chart
  Future<void> _openTradingView(String ticker) async {
    String tvSymbol = ticker;
    if (ticker.endsWith('.NS')) {
      tvSymbol = 'NSE:${ticker.replaceAll('.NS', '')}';
    } else if (ticker.endsWith('.BO')) {
      tvSymbol = 'BSE:${ticker.replaceAll('.BO', '')}';
    } else {
      tvSymbol = 'NSE:$ticker'; // fallback
    }

    final encodedSymbol = Uri.encodeComponent(tvSymbol);
    final urlString = 'https://www.tradingview.com/chart/b7xSVbGi/?symbol=$encodedSymbol';
    final Uri url = Uri.parse(urlString);

    try {
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
        debugPrint('Could not launch TradingView URL');
      }
    } catch (e) {
      debugPrint('Error launching TradingView URL: $e');
    }
  }

  // Generate percentage for distance bar
  double _distPct(double pct) {
    final capped = pct.clamp(0.0, 20.0);
    return (1.0 - capped / 20.0);
  }

  Color _getDistanceColor(double pct) {
    if (pct <= 5.0) return const Color(0xFFEF4444); // danger red
    if (pct <= 15.0) return const Color(0xFFFBBF24); // warn amber
    return const Color(0xFF10B981); // safe emerald
  }

  Color _getCCIColor(double cci) {
    if (cci < -100) return const Color(0xFFEF4444);
    if (cci >= -100 && cci < 0) return const Color(0xFFFBBF24);
    if (cci >= 0 && cci <= 100) return const Color(0xFF10B981);
    return const Color(0xFFF97316); // overbought orange
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final results = state.displayedResults;

    if (results.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 40.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.filter_list_off_rounded, size: 48, color: const Color(0xFF475569)),
              const SizedBox(height: 12),
              const Text(
                'No stocks match current filters',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 15, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      );
    }

    // Number formatters
    final numberFormat = NumberFormat('#,##0.00');
    final cciFormat = NumberFormat('#,##0.0');

    // Build standard DataTable inside SingleChildScrollView
    return Theme(
      data: Theme.of(context).copyWith(
        cardColor: const Color(0xFF1E293B),
        dividerColor: const Color(0xFF334155),
      ),
      child: Scrollbar(
        thumbVisibility: true,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            showCheckboxColumn: false,
            headingRowColor: WidgetStateProperty.all(const Color(0xFF0F172A)),
            dataRowColor: WidgetStateProperty.resolveWith<Color?>((Set<WidgetState> states) {
              if (states.contains(WidgetState.hovered)) {
                return const Color(0xFF1E293B).withOpacity(0.8);
              }
              return const Color(0xFF1E293B).withOpacity(0.4); // glass row background
            }),
            dataRowMaxHeight: 52,
            dataRowMinHeight: 48,
            columnSpacing: 20,
            horizontalMargin: 16,
            columns: [
              _buildHeaderColumn(state, 'Ticker', 'ticker'),
              _buildHeaderColumn(state, 'Close', 'close', numeric: true),
              _buildHeaderColumn(state, 'CCI (20)', 'cci20', numeric: true),
              const DataColumn(label: Text('Trend', style: TextStyle(color: Color(0xFF94A3B8), fontWeight: FontWeight.bold))),
              _buildHeaderColumn(state, 'SMA (20)', 'sma20', numeric: true),
              const DataColumn(label: Text('Signal', style: TextStyle(color: Color(0xFF94A3B8), fontWeight: FontWeight.bold))),
              _buildHeaderColumn(state, 'Yearly Low', 'yearlyLow', numeric: true),
              _buildHeaderColumn(state, 'Monthly Low', 'monthlyLow', numeric: true),
              _buildHeaderColumn(state, 'Weekly Low', 'weeklyLow', numeric: true),
              _buildHeaderColumn(state, '% Y Low', 'pctFromYLow', numeric: true),
              _buildHeaderColumn(state, '% M Low', 'pctFromMLow', numeric: true),
              _buildHeaderColumn(state, '% W Low', 'pctFromWLow', numeric: true),
            ],
            rows: results.map((row) {
              final cciColor = _getCCIColor(row.cci20);
              final isAboveSMA = row.close >= row.sma20;
              final distY = _distPct(row.pctFromYLow);

              return DataRow(
                onSelectChanged: (_) => _openTradingView(row.ticker),
                cells: [
                  // Ticker cell
                  DataCell(
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          row.ticker,
                          style: const TextStyle(
                            color: Color(0xFF818CF8), // indigo accent
                            fontWeight: FontWeight.bold,
                            decoration: TextDecoration.underline,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.open_in_new_rounded, size: 12, color: Color(0xFF6366F1)),
                      ],
                    ),
                  ),
                  // Close Price
                  DataCell(Text(numberFormat.format(row.close), style: const TextStyle(color: Colors.white))),
                  // CCI (20) with zone indicator
                  DataCell(
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          cciFormat.format(row.cci20),
                          style: TextStyle(color: cciColor, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(width: 4),
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(color: cciColor, shape: BoxShape.circle),
                        ),
                      ],
                    ),
                  ),
                  // Trend (Sparkline)
                  DataCell(SparklineWidget(data: row.sparkline)),
                  // SMA (20) and relative indicator
                  DataCell(
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(numberFormat.format(row.sma20), style: const TextStyle(color: Color(0xFFCBD5E1))),
                        const SizedBox(width: 6),
                        Text(
                          isAboveSMA ? '▲' : '▼',
                          style: TextStyle(
                            color: isAboveSMA ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Signal badge
                  DataCell(SignalBadge(signal: row.signal)),
                  // Lows
                  DataCell(Text(numberFormat.format(row.yearlyLow), style: const TextStyle(color: Color(0xFF94A3B8)))),
                  DataCell(Text(numberFormat.format(row.monthlyLow), style: const TextStyle(color: Color(0xFF94A3B8)))),
                  DataCell(Text(numberFormat.format(row.weeklyLow), style: const TextStyle(color: Color(0xFF94A3B8)))),
                  // Distance Y with progress bar
                  DataCell(
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 40,
                          height: 4,
                          decoration: BoxDecoration(
                            color: const Color(0xFF334155),
                            borderRadius: BorderRadius.circular(2),
                          ),
                          alignment: Alignment.centerLeft,
                          child: FractionallySizedBox(
                            widthFactor: distY,
                            heightFactor: 1.0,
                            child: Container(
                              decoration: BoxDecoration(
                                color: _getDistanceColor(row.pctFromYLow),
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${cciFormat.format(row.pctFromYLow)}%',
                          style: TextStyle(
                            color: row.pctFromYLow <= 5.0 ? const Color(0xFFEF4444) : const Color(0xFF94A3B8),
                            fontSize: 11,
                            fontWeight: row.pctFromYLow <= 5.0 ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Distance M
                  DataCell(
                    Text(
                      '${cciFormat.format(row.pctFromMLow)}%',
                      style: TextStyle(
                        color: row.pctFromMLow <= 5.0 ? const Color(0xFFFBBF24) : const Color(0xFF94A3B8),
                        fontSize: 12,
                        fontWeight: row.pctFromMLow <= 5.0 ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                  ),
                  // Distance W
                  DataCell(
                    Text(
                      '${cciFormat.format(row.pctFromWLow)}%',
                      style: TextStyle(
                        color: row.pctFromWLow <= 5.0 ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
                        fontSize: 12,
                        fontWeight: row.pctFromWLow <= 5.0 ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                  ),
                ],
              );
            }).toList(),
          ),
        ),
      ),
    );
  }

  // DataColumn helper for sorting headers
  DataColumn _buildHeaderColumn(AppState state, String label, String colKey, {bool numeric = false}) {
    final isSorted = state.sortColumn == colKey;

    return DataColumn(
      numeric: numeric,
      onSort: (_, __) => state.sortBy(colKey),
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: TextStyle(
              color: isSorted ? Colors.white : const Color(0xFF94A3B8),
              fontWeight: FontWeight.bold,
            ),
          ),
          if (isSorted) ...[
            const SizedBox(width: 4),
            Icon(
              state.sortAscending ? Icons.arrow_upward : Icons.arrow_downward,
              size: 14,
              color: Colors.white,
            ),
          ],
        ],
      ),
    );
  }
}
