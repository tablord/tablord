# first test just to see if travis ... is ok
import os


def func(x):
    return x + 1


def test_answer():
    assert func(3) == 4


def test_get_commit_number(capsys):
    with capsys.disabled():
        print('commit number is '+os.getenv('TRAVIS_COMMIT','not in travis'))
