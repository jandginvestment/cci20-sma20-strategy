import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/signal.dart';
import '../providers/app_state.dart';

class SignalChips extends StatelessWidget {
  const SignalChips({super.key});

  Widget _buildChip(
    BuildContext context, {
    required String label,
    required SignalType type,
    required Color activeColor,
    required Color inactiveColor,
    required Color textColor,
  }) {
    final state = Provider.of<AppState>(context);
    final isSelected = state.activeSignalFilter == type;

    return GestureDetector(
      onTap: () => state.setSignalFilter(type),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? activeColor : const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? activeColor.withOpacity(0.8) : const Color(0xFF334155),
            width: 1.5,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: activeColor.withOpacity(0.25),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  )
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : textColor,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final hasActiveFilter = state.activeSignalFilter != 'all';

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'Signals',
                style: TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
              if (hasActiveFilter) ...[
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => state.setSignalFilter('all'),
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF334155),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.close,
                      size: 12,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildChip(
                context,
                label: '🔴 Reversal Zone',
                type: SignalType.reversal,
                activeColor: const Color(0xFFEF4444),
                inactiveColor: const Color(0x11EF4444),
                textColor: const Color(0xFFEF4444),
              ),
              _buildChip(
                context,
                label: '🟡 Recovery',
                type: SignalType.recovery,
                activeColor: const Color(0xFFD97706),
                inactiveColor: const Color(0x11D97706),
                textColor: const Color(0xFFF59E0B),
              ),
              _buildChip(
                context,
                label: '🟢 Bullish Setup',
                type: SignalType.momentum,
                activeColor: const Color(0xFF10B981),
                inactiveColor: const Color(0x1110B981),
                textColor: const Color(0xFF10B981),
              ),
              _buildChip(
                context,
                label: '🟠 Overbought',
                type: SignalType.overbought,
                activeColor: const Color(0xFFF97316),
                inactiveColor: const Color(0x11F97316),
                textColor: const Color(0xFFF97316),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
