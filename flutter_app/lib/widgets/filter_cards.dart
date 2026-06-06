import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';

class FilterCards extends StatelessWidget {
  const FilterCards({super.key});

  Widget _buildCard(
    BuildContext context, {
    required String label,
    required String subLabel,
    required String count,
    required TimeframeFilter filterType,
    required IconData icon,
    required Color color,
    required Color iconBgColor,
  }) {
    final state = Provider.of<AppState>(context);
    final isSelected = state.activeFilter == filterType;

    return Expanded(
      child: GestureDetector(
        onTap: () => state.setFilter(filterType),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B).withOpacity(0.6), // card-glass effect
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? color : const Color(0xFF334155),
              width: 1.5,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: color.withOpacity(0.15),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    )
                  ]
                : null,
          ),
          child: Row(
            children: [
              // Icon container
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: iconBgColor,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  size: 18,
                  color: color,
                ),
              ),
              const SizedBox(width: 12),
              // Label and value
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    RichText(
                      text: TextSpan(
                        text: label,
                        style: const TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                        children: subLabel.isNotEmpty
                            ? [
                                const TextSpan(text: ' '),
                                TextSpan(
                                  text: subLabel,
                                  style: TextStyle(
                                    color: color,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ]
                            : null,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      count,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              // Active indicator dot
              if (isSelected)
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);

    return LayoutBuilder(
      builder: (context, constraints) {
        // Decide if we should lay out in a single row or 2x2 grid
        final isNarrow = constraints.maxWidth < 600;

        final cards = [
          _buildCard(
            context,
            label: 'All Stocks',
            subLabel: '',
            count: state.results.length.toString(),
            filterType: TimeframeFilter.all,
            icon: Icons.dashboard_outlined,
            color: const Color(0xFF818CF8), // Indigo
            iconBgColor: const Color(0x11818CF8),
          ),
          _buildCard(
            context,
            label: 'Near 1-Yr Low',
            subLabel: '≤5%',
            count: state.nearYLowCount.toString(),
            filterType: TimeframeFilter.year,
            icon: Icons.warning_amber_rounded,
            color: const Color(0xFFEF4444), // Red
            iconBgColor: const Color(0x11EF4444),
          ),
          _buildCard(
            context,
            label: 'Near 1-Mo Low',
            subLabel: '≤5%',
            count: state.nearMLowCount.toString(),
            filterType: TimeframeFilter.month,
            icon: Icons.calendar_month_outlined,
            color: const Color(0xFFFBBF24), // Amber
            iconBgColor: const Color(0x11FBBF24),
          ),
          _buildCard(
            context,
            label: 'Near 1-Wk Low',
            subLabel: '≤5%',
            count: state.nearWLowCount.toString(),
            filterType: TimeframeFilter.week,
            icon: Icons.show_chart_outlined,
            color: const Color(0xFF10B981), // Emerald
            iconBgColor: const Color(0x1110B981),
          ),
        ];

        if (isNarrow) {
          // 2x2 Grid using columns of rows
          return Column(
            children: [
              Row(
                children: [
                  cards[0],
                  const SizedBox(width: 10),
                  cards[1],
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  cards[2],
                  const SizedBox(width: 10),
                  cards[3],
                ],
              ),
            ],
          );
        } else {
          // Horizontal row of all 4 cards
          return Row(
            children: [
              cards[0],
              const SizedBox(width: 12),
              cards[1],
              const SizedBox(width: 12),
              cards[2],
              const SizedBox(width: 12),
              cards[3],
            ],
          );
        }
      },
    );
  }
}
