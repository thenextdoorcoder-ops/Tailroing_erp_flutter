import 'package:flutter/material.dart';
import 'package:record/record.dart';
import 'package:just_audio/just_audio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/foundation.dart';
import '../../../core/constants/app_colors.dart';

class VoiceNoteWidget extends StatefulWidget {
  /// Existing voice note URL from server (if any)
  final String? existingUrl;

  /// Called when a new recording is completed with the file path
  final Future<bool> Function(String filePath)? onRecordingComplete;

  const VoiceNoteWidget({
    super.key,
    this.existingUrl,
    this.onRecordingComplete,
  });

  @override
  State<VoiceNoteWidget> createState() => _VoiceNoteWidgetState();
}

class _VoiceNoteWidgetState extends State<VoiceNoteWidget>
    with TickerProviderStateMixin {
  final _recorder = AudioRecorder();
  final _player = AudioPlayer();

  bool _isRecording = false;
  bool _isPlaying = false;
  bool _hasNewRecording = false;
  String? _recordedPath;
  Duration _recordDuration = Duration.zero;
  Duration _playPosition = Duration.zero;
  Duration _playDuration = Duration.zero;

  late AnimationController _pulseController;
  late Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.8, end: 1.2).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _player.positionStream.listen((pos) {
      if (mounted) setState(() => _playPosition = pos);
    });
    _player.durationStream.listen((dur) {
      if (mounted) setState(() => _playDuration = dur ?? Duration.zero);
    });
    _player.playerStateStream.listen((state) {
      if (state.processingState == ProcessingState.completed) {
        if (mounted) setState(() => _isPlaying = false);
        _player.seek(Duration.zero);
      }
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _recorder.dispose();
    _player.dispose();
    super.dispose();
  }

  Future<void> _startRecording() async {
    if (!kIsWeb) {
      final status = await Permission.microphone.request();
      if (!status.isGranted) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Microphone permission required')),
          );
        }
        return;
      }
    }

    String path;
    if (kIsWeb) {
      path = 'voice_note_${DateTime.now().millisecondsSinceEpoch}.webm';
    } else {
      final dir = await getTemporaryDirectory();
      path = '${dir.path}/voice_note_${DateTime.now().millisecondsSinceEpoch}.m4a';
    }

    await _recorder.start(
      const RecordConfig(encoder: AudioEncoder.aacLc, bitRate: 128000),
      path: path,
    );

    setState(() {
      _isRecording = true;
      _recordDuration = Duration.zero;
    });

    // Update timer every second
    _tickRecordDuration();
  }

  void _tickRecordDuration() {
    Future.delayed(const Duration(seconds: 1), () {
      if (_isRecording && mounted) {
        setState(() => _recordDuration += const Duration(seconds: 1));
        _tickRecordDuration();
      }
    });
  }

  Future<void> _stopRecording() async {
    final path = await _recorder.stop();
    if (path != null && mounted) {
      setState(() {
        _isRecording = false;
        _recordedPath = path;
        _hasNewRecording = true;
      });
    }
  }

  Future<void> _playRecording(String url) async {
    if (_isPlaying) {
      await _player.pause();
      setState(() => _isPlaying = false);
      return;
    }
    try {
      if (_hasNewRecording && _recordedPath != null) {
        if (kIsWeb) {
          // Web: path is a blob URL
          await _player.setUrl(_recordedPath!);
        } else {
          await _player.setFilePath(_recordedPath!);
        }
      } else {
        await _player.setUrl(url);
      }
      await _player.play();
      setState(() => _isPlaying = true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Playback error: $e')),
        );
      }
    }
  }

  Future<void> _saveRecording() async {
    if (_recordedPath == null) return;
    final ok = await widget.onRecordingComplete?.call(_recordedPath!);
    if (ok == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Voice note saved!'),
          backgroundColor: AppColors.success,
        ),
      );
    }
  }

  String _formatDuration(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hasAudio = widget.existingUrl != null || _hasNewRecording;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.mic_none_rounded,
                  color: AppColors.primary, size: 18),
              const SizedBox(width: 6),
              const Text(
                'Voice Note',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
              ),
              if (_hasNewRecording) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text(
                    'New • Unsaved',
                    style: TextStyle(
                      fontSize: 10,
                      color: AppColors.warning,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 12),

          // Playback row (if audio exists)
          if (hasAudio) ...[
            _buildPlaybackBar(isDark),
            const SizedBox(height: 10),
          ],

          // Record controls
          Row(
            children: [
              if (!_isRecording) ...[
                // Record button
                _buildIconAction(
                  icon: Icons.fiber_manual_record,
                  label: hasAudio ? 'Re-record' : 'Record',
                  color: AppColors.error,
                  onTap: _startRecording,
                ),
              ] else ...[
                // Pulsing recording indicator
                AnimatedBuilder(
                  animation: _pulseAnim,
                  builder: (_, child) => Transform.scale(
                    scale: _pulseAnim.value,
                    child: child,
                  ),
                  child: Container(
                    width: 12,
                    height: 12,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.error,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Recording  ${_formatDuration(_recordDuration)}',
                  style: const TextStyle(
                    color: AppColors.error,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                const Spacer(),
                _buildIconAction(
                  icon: Icons.stop_rounded,
                  label: 'Stop',
                  color: AppColors.error,
                  onTap: _stopRecording,
                ),
              ],
              if (_hasNewRecording && widget.onRecordingComplete != null) ...[
                const SizedBox(width: 12),
                _buildIconAction(
                  icon: Icons.cloud_upload_outlined,
                  label: 'Save',
                  color: AppColors.success,
                  onTap: _saveRecording,
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPlaybackBar(bool isDark) {
    final url = _hasNewRecording ? _recordedPath! : widget.existingUrl!;
    final progress = _playDuration.inMilliseconds > 0
        ? _playPosition.inMilliseconds / _playDuration.inMilliseconds
        : 0.0;

    return Row(
      children: [
        GestureDetector(
          onTap: () => _playRecording(url),
          child: Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
            child: Icon(
              _isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
              color: Colors.white,
              size: 22,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progress.clamp(0.0, 1.0),
                  backgroundColor:
                      isDark ? AppColors.borderDark : AppColors.borderLight,
                  valueColor:
                      const AlwaysStoppedAnimation(AppColors.primary),
                  minHeight: 6,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${_formatDuration(_playPosition)} / ${_formatDuration(_playDuration)}',
                style: TextStyle(
                  fontSize: 11,
                  color: isDark
                      ? AppColors.textMutedDark
                      : AppColors.textMutedLight,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildIconAction({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
