import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/app_state.dart';
import '../widgets/sidebar.dart';
import '../widgets/filter_cards.dart';
import '../widgets/signal_chips.dart';
import '../widgets/scanner_table.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    // Fetch initial watchlist data on load
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<AppState>(context, listen: false).fetchWatchlists();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final theme = Theme.of(context);

    // App colors
    final bgDark = const Color(0xFF0B0F19); // deep slate/black background
    final cardBg = const Color(0xFF1E293B); // card dark background

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 900;

        // Active filter description string
        String filterDescription = 'Showing ${state.displayedResults.length} of ${state.results.length} stocks';
        if (state.activeFilter != TimeframeFilter.all || state.activeSignalFilter != 'all') {
          final List<String> descriptions = [];
          if (state.activeFilter != TimeframeFilter.all) {
            descriptions.add('Near ${state.activeFilter.name.toUpperCase()} Low');
          }
          if (state.activeSignalFilter != 'all') {
            descriptions.add(state.activeSignalFilter.toString().split('.').last.toUpperCase());
          }
          filterDescription += ' matching [${descriptions.join(" + ")}]';
        }

        // Dashboard main content
        Widget mainContent = Scaffold(
          backgroundColor: bgDark,
          appBar: AppBar(
            backgroundColor: const Color(0xFF0F172A),
            elevation: 0,
            leading: isWide
                ? null
                : Builder(
                    builder: (context) => IconButton(
                      icon: const Icon(Icons.menu_rounded, color: Colors.white),
                      onPressed: () => Scaffold.of(context).openDrawer(),
                    ),
                  ),
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  state.activeWatchlist?.name ?? 'Scanner',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (state.results.isNotEmpty)
                  Text(
                    'Last updated: ${DateFormat('MMM d, h:mm a').format(DateTime.now())}',
                    style: const TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 11,
                    ),
                  ),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh_rounded, color: Color(0xFF818CF8)),
                tooltip: 'Reload watchlist',
                onPressed: state.activeWatchlist != null
                    ? () => state.loadWatchlist(state.activeWatchlist!)
                    : null,
              ),
              const SizedBox(width: 8),
            ],
          ),
          drawer: isWide ? null : const Sidebar(isDrawer: true),
          body: state.loading && state.results.isEmpty
              ? const Center(
                  child: CircularProgressIndicator(
                    color: Color(0xFF818CF8),
                  ),
                )
              : SafeArea(
                  child: ListView(
                    padding: const EdgeInsets.all(16.0),
                    children: [
                      // Proximity filter cards
                      const FilterCards(),
                      const SizedBox(height: 16),

                      // Signal filter chips and summary count
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Expanded(child: SignalChips()),
                          const SizedBox(width: 16),
                          // Statistics or clear filters indicator
                          Padding(
                            padding: const EdgeInsets.only(top: 28.0),
                            child: Text(
                              filterDescription,
                              style: const TextStyle(
                                color: Color(0xFF64748B),
                                fontSize: 12.5,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Table card container
                      Container(
                        decoration: BoxDecoration(
                          color: cardBg.withOpacity(0.4),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFF334155),
                            width: 1.0,
                          ),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: state.loading
                            ? Container(
                                height: 200,
                                alignment: Alignment.center,
                                child: const CircularProgressIndicator(
                                  color: Color(0xFF818CF8),
                                ),
                              )
                            : state.error.isNotEmpty
                                ? Container(
                                    padding: const EdgeInsets.all(24.0),
                                    alignment: Alignment.center,
                                    child: Column(
                                      children: [
                                        const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 36),
                                        const SizedBox(height: 12),
                                        Text(
                                          state.error,
                                          style: const TextStyle(color: Colors.redAccent, fontSize: 14),
                                          textAlign: TextAlign.center,
                                        ),
                                        const SizedBox(height: 12),
                                        ElevatedButton(
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: const Color(0xFF818CF8),
                                          ),
                                          onPressed: state.fetchWatchlists,
                                          child: const Text('Try Again'),
                                        ),
                                      ],
                                    ),
                                  )
                                : const ScannerTable(),
                      ),
                    ],
                  ),
                ),
        );

        if (isWide) {
          // Wide layouts: Side panel + main content side-by-side
          return Row(
            children: [
              const Sidebar(isDrawer: false),
              // Border divider between sidebar and content
              Container(
                width: 1,
                color: const Color(0xFF1E293B),
              ),
              Expanded(
                child: mainContent,
              ),
            ],
          );
        }

        // Mobile/Tablet portrait: standard Scaffold with Drawer
        return mainContent;
      },
    );
  }
}
