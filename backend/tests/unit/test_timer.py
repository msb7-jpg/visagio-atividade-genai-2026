import time

from app.core.timer import ExecutionTimer


def test_timer_context_manager():
    with ExecutionTimer() as timer:
        time.sleep(0.01)

    assert timer.elapsed_seconds >= 0.009
    assert timer.elapsed_ms >= 9.0
    assert timer.duration_ms_int >= 9


def test_timer_start_stop():
    timer = ExecutionTimer().start()
    time.sleep(0.01)
    ms = timer.stop()
    assert ms >= 9.0
    assert timer.elapsed_ms == ms


def test_timer_static_methods():
    now1 = ExecutionTimer.perf_counter()
    ms1 = ExecutionTimer.now_ms()
    assert now1 > 0
    assert ms1 > 0
