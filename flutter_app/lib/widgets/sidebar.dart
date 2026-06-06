import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../models/watchlist.dart';

class Sidebar extends StatelessWidget {
  final bool isDrawer;

  const Sidebar({super.key, this.isDrawer = false});

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);

    // Sidebar background color
    final sidebarColor = const Color(0xFF0F172A); // slate-900

    Widget content = Container(
      width: 260,
      color: sidebarColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header / Branding
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              child: Row(
                children: [
                  Image.asset(
                    'assets/logo.png',
                    width: 32,
                    height: 32,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: const Color(0xFF818CF8).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Icon(
                          Icons.query_stats_rounded,
                          color: Color(0xFF818CF8),
                          size: 20,
                        ),
                      );
                    },
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'CCI / SMA',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                        ),
                        Text(
                          'Stock Scanner',
                          style: TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Divider
          Container(
            height: 1,
            color: const Color(0xFF1E293B),
            margin: const EdgeInsets.symmetric(horizontal: 16),
          ),

          const SizedBox(height: 16),

          // Section Title
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Text(
              'WATCHLISTS',
              style: TextStyle(
                color: Color(0xFF475569),
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.0,
              ),
            ),
          ),

          // Watchlist selection list
          Expanded(
            child: state.loading && state.watchlists.isEmpty
                ? const Center(
                    child: CircularProgressIndicator(
                      color: Color(0xFF818CF8),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: state.watchlists.length,
                    itemBuilder: (context, index) {
                      final wl = state.watchlists[index];
                      final isActive = state.activeWatchlist?.name == wl.name;

                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2.0),
                        child: InkWell(
                          onTap: () {
                            state.loadWatchlist(wl);
                            if (isDrawer) {
                              Navigator.pop(context); // close drawer on mobile
                            }
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                            decoration: BoxDecoration(
                              color: isActive
                                  ? const Color(0xFF1E293B) // slate-800
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                              border: isActive
                                  ? const Border(
                                      left: BorderSide(
                                        color: Color(0xFF818CF8),
                                        width: 3.0,
                                      ),
                                    )
                                  : null,
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  isActive
                                      ? Icons.folder_open_rounded
                                      : Icons.folder_rounded,
                                  size: 18,
                                  color: isActive
                                      ? const Color(0xFF818CF8)
                                      : const Color(0xFF64748B),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    wl.name,
                                    style: TextStyle(
                                      color: isActive
                                          ? Colors.white
                                          : const Color(0xFF94A3B8),
                                      fontWeight: isActive
                                          ? FontWeight.w600
                                          : FontWeight.w500,
                                      fontSize: 13.5,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),

          // Footer info
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Auto-updated 2x daily',
                  style: TextStyle(
                    color: Color(0xFF475569),
                    fontSize: 11,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Version 1.0.0',
                  style: TextStyle(
                    color: const Color(0xFF475569).withOpacity(0.8),
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );

    if (isDrawer) {
      return Drawer(
        elevation: 16,
        child: content,
      );
    }
    return content;
  }
}
